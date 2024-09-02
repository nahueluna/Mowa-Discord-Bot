import { ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { ActionRowBuilder, EmbedBuilder, ButtonBuilder } from '@discordjs/builders';
import { getMovieDetails, getMovieInfo } from '../../services/movieInfo.js';

export const data = new SlashCommandBuilder()
    .setName('search-movie')
    .setDescription('Replies with information about a movie or series')
    .addStringOption(option =>
        option.setName('title')
            .setDescription('The title of the movie or series')
            .setRequired(true));

export async function execute(interaction) {
    if (!interaction || !interaction.reply) {
        console.error('Interaction object is not defined or does not have a reply method.');
        return;
    }
    try {
        const title = interaction.options.getString('title');

        await interaction.reply('Buscando el título...');

        const movieInfo = await getMovieInfo(title);

        let currentIndex = 0;

        const previous = new ButtonBuilder()
            .setCustomId('previous')
            .setLabel('←')
            .setStyle(ButtonStyle.Primary);

        const next = new ButtonBuilder()
            .setCustomId('next')
            .setLabel('→')
            .setStyle(ButtonStyle.Primary);

        const first = new ButtonBuilder()
            .setCustomId('first')
            .setLabel('⇇')
            .setStyle(ButtonStyle.Primary);

        const last = new ButtonBuilder()
            .setCustomId('last')
            .setLabel('⇉')
            .setStyle(ButtonStyle.Primary);

        const plus = new ButtonBuilder()
            .setCustomId('plus')
            .setLabel('+')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(first, previous, plus, next, last);

        try {
            let embed = await createBasicEmbed(movieInfo[currentIndex], currentIndex, movieInfo.length);
            let response = await interaction.editReply({ content: '', embeds: [embed], components: [row] });

            const collector = response.createMessageComponentCollector({ time: 240_000 });
            let plusButtonState = false;

            collector.on('collect', async i => {
                try {
                    if (i.user.id !== interaction.user.id) {
                        i.reply({ content: 'Solo el usuario que solicitó la información puede interactuar', ephemeral: true });
                        return;
                    }

                    switch (i.customId) {
                        case 'previous':
                            currentIndex = (currentIndex - 1 + movieInfo.length) % movieInfo.length;
                            break;
                        case 'next':
                            currentIndex = (currentIndex + 1) % movieInfo.length;
                            break;
                        case 'first':
                            currentIndex = 0;
                            break;
                        case 'last':
                            currentIndex = movieInfo.length - 1;
                            break;
                        case 'plus':
                            await i.deferUpdate();

                            if (!plusButtonState) {
                                plusButtonState = true;

                                let movieDetails;

                                try {
                                    movieDetails = await getMovieDetails(movieInfo[currentIndex]);
                                } catch (error) {
                                    console.error('Failed to get movie details:', error);
                                    interaction
                                        .followUp({ content: 'No se pudo obtener toda la información adicional del título', ephemeral: true });

                                    movieDetails = movieInfo[currentIndex];
                                } finally {
                                    await i.editReply({ embeds: [await modifyEmbed(embed, movieDetails)] });
                                }

                            } else {
                                interaction.followUp({ content: 'La información adicional disponible ya fue mostrada', ephemeral: true });
                            }
                            return; // Evita actualizar el embed básico
                    }

                    plusButtonState = false;
                    embed = await createBasicEmbed(movieInfo[currentIndex], currentIndex, movieInfo.length);
                    await i.update({ embeds: [embed] });

                } catch (error) {
                    if (error.code === 10008) { // DiscordAPIError[10008]: Unknown Message
                        collector.stop('Message deleted');
                        throw error;
                    } else {
                        console.error('Failed to update the message:', error);
                    }
                }
            });

            collector.on('end', () => {
                try {
                    interaction.editReply({ components: [] });
                } catch (error) {
                    console.error('Failed to remove the collector:', error);
                    throw error;
                }
            });
        } catch (error) {
            console.error('Failed to create the collector:', error);
            throw error;
        }

    } catch (error) {
        if (error.code === 10008) { // DiscordAPIError[10008]: Unknown Message
            console.warn('The message may have been deleted before it could be edited.');
        } else {
            console.error('Failed to reply to interaction:', error);
            interaction.editReply('No se ha podido encontrar el título. Intente nuevamente.');
        }
    }
}

async function createBasicEmbed(movie, index, length) {
    try {
        const embed = new EmbedBuilder()
            .setColor(0xFCCA02)
            .setTitle(movie.title)
            .setURL(movie.url || null)
            .setThumbnail('https://www.justwatch.com/appassets/img/logo/JustWatch-logo-large.webp')
            .setImage(movie.poster || null)
            .setTimestamp()
            .setFooter({ text: `Page ${index + 1}/${length}` });

        const plataforms = movie.plataforms || [];
        const addInfo = movie.add_info || [];

        const plataformsFields = plataforms.map((plataform, internal_index) => ({
            name: `▸  ${plataform}`,
            value: addInfo[internal_index] || 'Streaming',
        }));

        if (plataformsFields.length > 0) {
            embed.addFields(plataformsFields);
        } else {
            embed.addFields({ name: 'No disponible', value: 'El título no está disponible en la región' });
        }

        return embed;
    } catch (error) {
        console.error('Failed to create the basic embed:', error);
        throw error;
    }
}

async function modifyEmbed(embed, movie) {
    if (movie.synopsis) {
        embed.setDescription(movie.synopsis);
    }

    const fieldsToCheck = [
        { name: 'Géneros', value: movie.genre ? movie.genre : null, inline: true },
        { name: 'Duración', value: movie.duration ? movie.duration : null, inline: true },
        { name: 'Calificación', value: movie.scoring ? `${movie.scoring} ★` : null, inline: true },
    ];

    // Agregará solo los campos cuyo valor se haya encontrado (no nulos) 
    fieldsToCheck.forEach(field => {
        if (field.value) {
            embed.addFields(field);
        }
    });

    return embed;
}
// Manejan errores no capturados por bloques try-catch
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});