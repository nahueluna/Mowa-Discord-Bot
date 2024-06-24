import { Client, GatewayIntentBits, Events} from 'discord.js';
import {config} from 'dotenv';

config();
const TOKEN = process.env.TOKEN;

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if(message.author.bot) return;
  if(!message.content.startsWith('!')) return;
  
  const args = message.content.slice(1).split(' ')[0];

  try {
    
    const command = require(`./commands/${args}`);
    command.run(message);

  } catch(error) {
    console.error(`An error occurred while using command !${args}: `, error);
  }
});

client.login(TOKEN);