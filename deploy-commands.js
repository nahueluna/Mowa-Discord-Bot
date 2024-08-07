import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { config } from 'dotenv';

config();
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];
// Toma las carpetas de comandos del directorio de comandos
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

(async () => {
	for (const folder of commandFolders) {
		// Toma todos los archivos de comandos del directorio de comandos
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
		// Toma la salida SlashCommandBuilder#toJSON() de cada comando para el deployment
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = await import(filePath);
			if ('data' in command && 'execute' in command) {
				commands.push(command.data.toJSON());
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}

	// Construye y prepara una instancia del módulo REST (para manejo de endpoints)
	const rest = new REST({ version: '9' }).setToken(TOKEN);

	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// El método put es usado para refrescar todos los comandos en el servidor con la configuración actual
		await rest.put(
			Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
			{ body: commands },
		);

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
	}
})();