# Discord reaction role bot

This bot adds a **Grant role to reactors** message context-menu command. Right-click a message, choose the command, and select a role in the private picker. It collects the unique IDs of human users who reacted with any emoji, keeps them only for that command invocation, and assigns the selected role to those users.

## Requirements

- Node.js 18 or newer
- A Discord application and bot added to the server
- The bot needs **View Channel** and **Read Message History** in the message's channel, plus **Manage Roles**
- The bot's highest role and the invoking user's highest role must both be above the role being assigned
- The invoking user must have **Manage Roles**

No Message Content or Guild Members privileged intent is needed. The bot uses Discord's message context menu rather than reading arbitrary message text. Bot accounts are excluded. Users who have left the server or cannot be assigned the role are counted as failures.

## Setup

1. Copy `.env.example` to `.env` and set the bot token and application client ID. Set `DISCORD_GUILD_ID` to register the command to one server for testing; omit it to register globally.
2. From this folder, run `npm install`.
3. Run `npm run register` once to publish the context-menu command.
4. Run `npm start` to start the bot.

The private role picker displays at most 25 eligible roles, as required by Discord's select-menu component limit.
