require('dotenv').config();

const {
  ActionRowBuilder,
  Client,
  ComponentType,
  GatewayIntentBits,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require('discord.js');

const { DISCORD_TOKEN } = process.env;
const COMMAND_NAME = 'Grant role to reactors';
const ROLE_PICKER_LIMIT = 25;

if (!DISCORD_TOKEN) {
  throw new Error('DISCORD_TOKEN must be set in .env.');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', () => {
  console.log(`Ready as ${client.user.tag}.`);
});

client.on('interactionCreate', async (interaction) => {
  if (
    !interaction.isMessageContextMenuCommand()
    || interaction.commandName !== COMMAND_NAME
  ) {
    return;
  }

  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({
      content: 'You need the Manage Roles permission to use this command.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const guild = interaction.guild;
    const botMember = await guild.members.fetch(client.user.id);
    const invokingMember = await guild.members.fetch(interaction.user.id);

    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.editReply('The bot needs the Manage Roles permission.');
      return;
    }

    const reactorIds = new Set();
    const message = interaction.targetMessage;

    for (const reaction of message.reactions.cache.values()) {
      let after;

      while (true) {
        const users = await reaction.users.fetch({
          limit: 100,
          ...(after ? { after } : {}),
        });

        for (const user of users.values()) {
          if (!user.bot) {
            reactorIds.add(user.id);
          }
        }

        if (users.size < 100) {
          break;
        }

        const lastUser = users.last();
        if (!lastUser || lastUser.id === after) {
          break;
        }
        after = lastUser.id;
      }
    }

    if (reactorIds.size === 0) {
      await interaction.editReply('No human users have reacted to that message.');
      return;
    }

    const eligibleRoles = guild.roles.cache
      .filter((role) => (
        role.id !== guild.id
        && !role.managed
        && botMember.roles.highest.comparePositionTo(role) > 0
        && invokingMember.roles.highest.comparePositionTo(role) > 0
      ))
      .sort((left, right) => right.position - left.position)
      .first(ROLE_PICKER_LIMIT);

    if (eligibleRoles.length === 0) {
      await interaction.editReply(
        'There are no assignable roles below both your highest role and the bot highest role.',
      );
      return;
    }

    const roleMenu = new StringSelectMenuBuilder()
      .setCustomId(`reactor-role:${interaction.id}`)
      .setPlaceholder('Choose a role to assign')
      .addOptions(eligibleRoles.map((role) => ({
        label: role.name.slice(0, 100),
        value: role.id,
      })));

    const reply = await interaction.editReply({
      content: `Found ${reactorIds.size} human reactor(s). Choose a role to assign:`,
      components: [new ActionRowBuilder().addComponents(roleMenu)],
    });

    const selection = await reply.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: (component) => component.user.id === interaction.user.id,
      time: 120_000,
    }).catch((error) => {
      if (error.code === 'InteractionCollectorError') {
        return null;
      }
      throw error;
    });

    if (!selection) {
      await interaction.editReply({
        content: 'Role selection expired. Run the command again when ready.',
        components: [],
      });
      return;
    }

    await selection.deferUpdate();

    const roleId = selection.values[0];
    const role = eligibleRoles.find((candidate) => candidate.id === roleId);
    if (!role) {
      await interaction.editReply({
        content: 'That role is not available for assignment.',
        components: [],
      });
      return;
    }

    let assigned = 0;
    let alreadyHadRole = 0;
    let failed = 0;

    for (const userId of reactorIds) {
      try {
        const member = await guild.members.fetch(userId);
        if (member.roles.cache.has(role.id)) {
          alreadyHadRole += 1;
          continue;
        }

        await member.roles.add(role, `Reaction role granted by ${interaction.user.tag}`);
        assigned += 1;
      } catch (error) {
        failed += 1;
        console.error(`Failed to assign role ${role.id} to member ${userId}:`, error);
      }
    }

    await interaction.editReply({
      content: [
        `Role **${role.name}** processing complete.`,
        `Assigned: ${assigned}`,
        `Already had role: ${alreadyHadRole}`,
        `Failed or no longer in server: ${failed}`,
      ].join('\n'),
      components: [],
    });
  } catch (error) {
    console.error('Failed to process the reaction role command:', error);
    await interaction.editReply(
      'Could not complete the request. Check that the bot can view the message and read its reaction users.',
    );
  }
});

client.login(DISCORD_TOKEN).catch((error) => {
  console.error('Failed to log in to Discord:', error);
  process.exitCode = 1;
});
