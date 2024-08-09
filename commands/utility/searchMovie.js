import { ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { ActionRowBuilder, EmbedBuilder, ButtonBuilder } from '@discordjs/builders';
import { getMovieInfo } from '../../services/movieInfo.js';

export const data = new SlashCommandBuilder()
    .setName('search-movie')
    .setDescription('Replies with information about a movie')
    .addStringOption(option =>
        option.setName('title')
            .setDescription('The title of the movie')
            .setRequired(true));

export async function execute(interaction) {
    if (!interaction || !interaction.reply) {
        console.error('Interaction object is not defined or does not have a reply method.');
        return;
    }
    try {
        const title = interaction.options.getString('title');
        
        await interaction.reply('Buscando la pelicula...');

        const movieInfo = await getMovieInfo(title);

        const createEmbed = (index) => {
            const movie = movieInfo[index];

            if(!movie || !movie.poster) {
                throw new Error('Pelicula no encontrada');
            }

            const embed = new EmbedBuilder()
                .setColor(0x8626B6)
                .setTitle(movie.title)
                .setAuthor({name: interaction.user.username, iconURL: interaction.user.avatarURL()})
                .addFields({name: 'Disponible en:', value: ' '})
                .setImage(movie.poster)
                .setTimestamp()
                .setFooter({text: `Page ${index + 1}/${movieInfo.length}`});

            const plataforms = movieInfo[index].plataforms || [];
            const addInfo = movieInfo[index].add_info || [];

            const plataformsFields = plataforms.map((plataform, internal_index) => ({
                name: plataform,
                value: addInfo[internal_index] || ' ',
                inline: true
            }));

            if(plataformsFields.length > 0) {
                embed.addFields(plataformsFields);
            } else {
                embed.addFields({name: 'No disponible', value: ' ', inline: true});
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

        let response = await interaction.editReply({embeds: [createEmbed(currentIndex)], components: [row]});

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
        interaction.editReply('Error al buscar la pelicula');
    }
}