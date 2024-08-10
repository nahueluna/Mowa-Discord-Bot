import { ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { ActionRowBuilder, EmbedBuilder, ButtonBuilder } from '@discordjs/builders';
import { getMovieInfo } from '../../services/movieInfo.js';

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

        const createEmbed = (index) => {
            const movie = movieInfo[index];

            if(!movie) {
                throw new Error('Título no encontrada');
            }

            const embed = new EmbedBuilder()
                .setColor(0xFCCA02)
                .setTitle(movie.title)
                .setAuthor({name: interaction.user.username, iconURL: interaction.user.avatarURL()})
                .setThumbnail('https://www.justwatch.com/appassets/img/logo/JustWatch-logo-large.webp')
                .addFields({name: 'Disponible en:', value: ' '})
                .setImage(movie.poster || null)
                .setTimestamp()
                .setFooter({text: `Page ${index + 1}/${movieInfo.length}`});

            const plataforms = movieInfo[index].plataforms || [];
            const addInfo = movieInfo[index].add_info || [];

            const plataformsFields = plataforms.map((plataform, internal_index) => ({
                name: `▸  ${plataform}`,
                value: addInfo[internal_index] || ' ',
                inline: true
            }));

            if(plataformsFields.length > 0) {
                embed.addFields(plataformsFields);
            } else {
                embed.addFields({name: ' ', value: 'No disponible', inline: true});
            }

            if(movie.scoring) {
                embed.addFields({name: 'Calificación:', value: `${movie.scoring} ★`});
            }
        
            return embed;
        }
        
        let currentIndex = 0;

        const previous = new ButtonBuilder()
            .setCustomId('previous')
            .setLabel('←')
            .setStyle(ButtonStyle.Primary);

        const next = new ButtonBuilder()
            .setCustomId('next')
            .setLabel('→')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(previous, next);

        let response = await interaction.editReply({content: '', embeds: [createEmbed(currentIndex)], components: [row]});

        const collectorFilter = i => i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({filter: collectorFilter, time: 60_000});

        collector.on('collect', async i => {
            if(i.customId === 'previous') {
                currentIndex = (currentIndex - 1 + movieInfo.length) % movieInfo.length;
            } else if (i.customId === 'next') {
                currentIndex = (currentIndex + 1) % movieInfo.length;
            }
            const embed = createEmbed(currentIndex);
            await i.update({embeds: [embed]});
        });

        collector.on('end',() => {
            interaction.editReply({embeds: [createEmbed(currentIndex)], components: []});
        });
    } catch (error) {
        console.error('Failed to reply to interaction:', error);
        interaction.editReply('Error al buscar el título');
    }
}