import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { getReactionsForUser, getRoleHistory } from '../services/database.js';
import { getUserStats } from '../services/reputation.js';
import { getSenseiDecayStatus } from '../services/decay.js';
import { Role } from '../types.js';

export const data = new SlashCommandBuilder()
  .setName('daimyo-audit')
  .setDescription('[Admin] Display detailed audit information for a user')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((option) =>
    option.setName('user').setDescription('User to audit').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('user', true);
    const guild = interaction.guild;

    if (!guild) {
      await interaction.editReply('This command can only be used in a server.');
      return;
    }

    console.log(`Audit command executed by ${interaction.user.tag} for ${targetUser.tag}`);

    // Get user stats
    const stats = getUserStats(guild, targetUser.id);

    // Build audit message
    let message = `🔍 **Audit Report for ${targetUser.tag}**\n\n`;

    // Current status
    message += `**Current Role:** ${stats.currentRole || 'None'}\n`;
    message += `**Total Reactions:** ${stats.breakdown.total}\n`;
    message += `  - From Kōhai: ${stats.breakdown.fromKohai}\n`;
    message += `  - From Senpai: ${stats.breakdown.fromSenpai}\n`;
    message += `  - From Sensei: ${stats.breakdown.fromSensei}\n\n`;

    // Score calculations
    if (stats.currentRole === Role.Kohai && stats.senpaiScore) {
      const score = stats.senpaiScore;
      message += `**Senpai Score:**\n`;
      message += `  - Reactions: ${score.totalReactions}/${score.threshold} ${score.meetsThreshold ? '✅' : '❌'}\n`;
      message += `  - Unique: ${score.uniqueReactors}/${score.uniqueRequired} ${score.meetsUnique ? '✅' : '❌'}\n\n`;
    } else if (stats.currentRole === Role.Senpai && stats.senseiScore) {
      const score = stats.senseiScore;
      message += `**Sensei Score:**\n`;
      message += `  - Reactions: ${score.totalReactions}/${score.threshold} ${score.meetsThreshold ? '✅' : '❌'}\n`;
      message += `  - Unique: ${score.uniqueReactors}/${score.uniqueRequired} ${score.meetsUnique ? '✅' : '❌'}\n\n`;
    } else if (stats.currentRole === Role.Sensei) {
      const decayStatus = getSenseiDecayStatus(targetUser.id);
      message += `**Decay Status:**\n`;
      message += `  - Recent Sensei reactions (${decayStatus.windowDays} days): ${decayStatus.recentCount}/${decayStatus.threshold}\n`;
      message += `  - Status: ${decayStatus.recentCount >= decayStatus.threshold ? '✅ Active' : '⚠️ At risk'}\n\n`;
    }

    // Role history
    const roleHistory = getRoleHistory(targetUser.id);
    if (roleHistory.length > 0) {
      message += `**Role History (last 10):**\n`;
      const recentHistory = roleHistory.slice(0, 10);
      for (const entry of recentHistory) {
        const date = new Date(entry.timestamp).toLocaleDateString();
        message += `  - ${date}: ${entry.role} (${entry.reason})\n`;
      }
      if (roleHistory.length > 10) {
        message += `  _...and ${roleHistory.length - 10} more entries_\n`;
      }
      message += '\n';
    }

    // Recent reactions received (last 10)
    const reactions = getReactionsForUser(targetUser.id);
    if (reactions.length > 0) {
      message += `**Recent Reactions (last 10):**\n`;
      const recentReactions = reactions.slice(0, 10);
      for (const reaction of recentReactions) {
        const date = new Date(reaction.timestamp).toLocaleDateString();
        message += `  - ${date}: from user ${reaction.reactor_id} (${reaction.reactor_role_at_time})\n`;
      }
      if (reactions.length > 10) {
        message += `  _...and ${reactions.length - 10} more reactions_\n`;
      }
    } else {
      message += `**Recent Reactions:** _None_\n`;
    }

    await interaction.editReply(message);
  } catch (error) {
    console.error('Error executing audit command:', error);
    await interaction.editReply('An error occurred while generating audit report.');
  }
}
