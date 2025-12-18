import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Role } from '../types.js';
import { getUserStats } from '../services/reputation.js';
import { getSenseiDecayStatus } from '../services/decay.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Display reputation statistics for a user')
  .addUserOption((option) =>
    option.setName('user').setDescription('User to check (defaults to yourself)').setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply();

    // Get target user (default to command invoker)
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild;

    if (!guild) {
      await interaction.editReply('This command can only be used in a server.');
      return;
    }

    // Get user stats
    const stats = getUserStats(guild, targetUser.id);

    if (!stats.currentRole) {
      await interaction.editReply(
        `${targetUser.tag} does not have a reputation role in this server.`
      );
      return;
    }

    // Build stats message
    let message = `🎌 **Reputation Stats for ${targetUser.tag}**\n\n`;
    message += `**Current Role:** ${stats.currentRole}\n`;
    message += `**Total :dojo: reactions:** ${stats.breakdown.total}\n`;
    message += `  - From Kōhai: ${stats.breakdown.fromKohai} (display only)\n`;
    message += `  - From Senpai: ${stats.breakdown.fromSenpai}\n`;
    message += `  - From Sensei: ${stats.breakdown.fromSensei}\n\n`;

    // Show progress based on current role
    if (stats.currentRole === Role.Kohai && stats.senpaiScore) {
      const score = stats.senpaiScore;
      const reactionProgress = score.meetsThreshold
        ? `${score.totalReactions}/${score.threshold} reactions ✅`
        : `${score.totalReactions}/${score.threshold} reactions (${score.threshold - score.totalReactions} more needed)`;
      const uniqueProgress = score.meetsUnique
        ? `${score.uniqueReactors}/${score.uniqueRequired} unique reactors ✅`
        : `${score.uniqueReactors}/${score.uniqueRequired} unique reactors (${score.uniqueRequired - score.uniqueReactors} more needed)`;

      message += `**Progress to Senpai:** ${reactionProgress} | ${uniqueProgress}\n`;
      message += `_(Requires ${score.threshold} reactions from ${score.uniqueRequired} unique Senpai/Sensei)_`;
    } else if (stats.currentRole === Role.Senpai && stats.senseiScore) {
      const score = stats.senseiScore;
      const reactionProgress = score.meetsThreshold
        ? `${score.totalReactions}/${score.threshold} reactions ✅`
        : `${score.totalReactions}/${score.threshold} reactions (${score.threshold - score.totalReactions} more needed)`;
      const uniqueProgress = score.meetsUnique
        ? `${score.uniqueReactors}/${score.uniqueRequired} unique Sensei ✅`
        : `${score.uniqueReactors}/${score.uniqueRequired} unique Sensei (${score.uniqueRequired - score.uniqueReactors} more needed)`;

      message += `**Progress to Sensei:** ${reactionProgress} | ${uniqueProgress}\n`;
      message += `_(Requires ${score.threshold} reactions from ${score.uniqueRequired} unique Sensei)_`;
    } else if (stats.currentRole === Role.Sensei) {
      const decayStatus = getSenseiDecayStatus(targetUser.id);
      const status =
        decayStatus.recentCount >= decayStatus.threshold
          ? `${decayStatus.recentCount}/${decayStatus.threshold} ✅`
          : `${decayStatus.recentCount}/${decayStatus.threshold} ⚠️`;

      message += `**Sensei reactions (last ${decayStatus.windowDays} days):** ${status}`;
    }

    await interaction.editReply(message);
    console.log(`Stats command executed by ${interaction.user.tag} for ${targetUser.tag}`);
  } catch (error) {
    console.error('Error executing stats command:', error);
    await interaction.editReply('An error occurred while fetching stats.');
  }
}
