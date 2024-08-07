import { SlashCommandBuilder } from 'discord.js';
import { EmbedBuilder } from '@discordjs/builders';
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
            const embed = new EmbedBuilder()
                .setColor(0x8626B6)
                .setTitle(movie.title)
                .setAuthor({name: interaction.user.username, iconURL: interaction.user.avatarURL()})
                .addFields({name: 'Disponible en:', value: ' '})
                .setImage(movie.poster)
                .setTimestamp();

            const plataforms = movieInfo[0].plataforms || [];
            const addInfo = movieInfo[0].add_info || [];

            const plataformsFields = plataforms.map((plataform, index) => ({
                name: plataform,
                value: addInfo[index] || ' ',
                inline: true
            }));

            if(plataformsFields.length > 0) {
                embed.addFields(plataformsFields);
            } else {
                embed.addFields({name: 'No disponible', value: ' ', inline: true});
            }
        
            return embed;
        }
        
        await interaction.editReply({embeds: [createEmbed(0)]});
    } catch (error) {
        console.error('Failed to reply to interaction:', error);
        interaction.editReply('Error al buscar la pelicula');
    }
}