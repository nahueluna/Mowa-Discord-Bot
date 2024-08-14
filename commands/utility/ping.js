import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!');

export async function execute(interaction) {
    if (!interaction || !interaction.reply) {
        console.error('Interaction object is not defined or does not have a reply method.');
        return;
    }
    try {
        await interaction.reply('Pong!');
    } catch (error) {
        console.error('Failed to reply to interaction:', error);
    }
}