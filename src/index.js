import { Client, GatewayIntentBits, Routes } from 'discord.js';
import { config } from 'dotenv';
import { REST } from '@discordjs/rest'

config();
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ] });

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

async function main() {
  const commands = [{
    name: 'ping',
    description: 'Replies with Pong!',
  }];

  try {
    console.log('Started refreshing application (/) commands');
    // Temporal para probar los comandos, se debe hacer global
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    
    client.login(TOKEN);
  } catch(error) {
    console.error(error);
  }
}

main();