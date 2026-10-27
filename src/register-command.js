require('dotenv').config();

const {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  REST,
  Routes,
} = require('discord.js');

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env.');
}

const command = new ContextMenuCommandBuilder()
  .setName('Grant role to reactors')
  .setType(ApplicationCommandType.Message);

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
const route = DISCORD_GUILD_ID
  ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID)
  : Routes.applicationCommands(DISCORD_CLIENT_ID);

rest.put(route, { body: [command.toJSON()] })
  .then(() => {
    const scope = DISCORD_GUILD_ID ? 'the configured server' : 'all servers';
    console.log(`Registered the message command for ${scope}.`);
  })
  .catch((error) => {
    console.error('Failed to register the message command:', error);
    process.exitCode = 1;
  });
