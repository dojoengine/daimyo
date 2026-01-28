import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { config } from '../utils/config.js';
import { insertReaction } from '../services/database.js';
import { getUserRole } from '../services/roleManager.js';
import { checkPromotion } from '../services/reputation.js';

/**
 * Format the :dojo: emoji for use in messages
 */
function getDojoEmoji(): string {
  if (config.dojoEmojiId) {
    return `<:${config.dojoEmojiName}:${config.dojoEmojiId}>`;
  }
  return `:${config.dojoEmojiName}:`;
}

export const data = new SlashCommandBuilder()
  .setName('bow')
  .setDescription('Acknowledge a user with a :dojo: reaction')
  .addUserOption((option) =>
    option.setName('user').setDescription('User to acknowledge').setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('reason').setDescription('Reason for acknowledgment').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason', true);
  const reactor = interaction.user;
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  // Prevent self-acknowledgment
  if (targetUser.id === reactor.id) {
    await interaction.reply({ content: 'You cannot bow to yourself.', ephemeral: true });
    return;
  }

  // Prevent acknowledging bots
  if (targetUser.bot) {
    await interaction.reply({ content: 'You cannot bow to a bot.', ephemeral: true });
    return;
  }

  // Get reactor's current role
  const reactorRole = getUserRole(guild, reactor.id);
  if (!reactorRole) {
    await interaction.reply({
      content: 'You must have a reputation role to use this command.',
      ephemeral: true,
    });
    return;
  }

  // Post the recognition message
  const emoji = getDojoEmoji();
  const message = await interaction.reply({
    content: `**${reactor}** ${emoji}'d **${targetUser}**: ${reason}`,
    fetchReply: true,
  });

  // Insert reaction into database
  const inserted = await insertReaction(message.id, targetUser.id, reactor.id, reactorRole);

  if (inserted) {
    console.log(
      `🙇 Bow: ${reactor.tag} (${reactorRole}) -> ${targetUser.tag} (${targetUser.id}): ${reason}`
    );

    // Check if this triggers a promotion
    const promotionResult = await checkPromotion(guild, targetUser.id);

    if (promotionResult.promoted) {
      console.log(
        `🎉 Promotion triggered: ${targetUser.id} ${promotionResult.oldRole} -> ${promotionResult.newRole}`
      );
    }
  } else {
    console.warn(`Bow insertion failed (duplicate?): ${reactor.id} -> ${targetUser.id}`);
  }
}
