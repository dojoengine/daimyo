import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Role } from '../types.js';
import { getUserStats } from '../services/reputation.js';
import { getSenseiDecayStatus } from '../services/decay.js';
import { getRoleCounts } from '../services/roleManager.js';
import { getDetailedSenseiBreakdown } from '../services/database.js';
import { config } from '../utils/config.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Display reputation statistics for a user')
  .addUserOption((option) =>
    option.setName('user').setDescription('User to check (defaults to yourself)').setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild;

    if (!guild) {
      await interaction.editReply('This command can only be used in a server.');
      return;
    }

    const stats = await getUserStats(guild, targetUser.id);

    if (!stats.currentRole) {
      await interaction.editReply(
        `${targetUser.tag} does not have a reputation role in this server.`
      );
      return;
    }

    const roleCounts = getRoleCounts(guild);

    let message = `**Reputation Stats for ${targetUser.tag}**\n\n`;
    message += `**Current Role:** ${stats.currentRole}\n\n`;

    // Build breakdown section based on role
    if (stats.currentRole === Role.Sensei) {
      // Sensei: show only last 360 days
      const senseiBreakdown = await getDetailedSenseiBreakdown(
        targetUser.id,
        config.decayWindowDays
      );
      const senseiPct =
        roleCounts.sensei > 0
          ? Math.round((senseiBreakdown.uniqueReactors / roleCounts.sensei) * 100)
          : 0;

      message += `**:dojo: Reactions (last ${config.decayWindowDays} days):**\n`;
      message += `  ${senseiBreakdown.reactions} reactions from ${senseiPct}% of Sensei\n\n`;

      // Decay status
      const decayStatus = await getSenseiDecayStatus(targetUser.id);
      if (decayStatus.recentCount >= decayStatus.threshold) {
        message += `**Status:** Sensei maintained ✅`;
      } else {
        const needed = decayStatus.threshold - decayStatus.recentCount;
        message += `**To Maintain:** ${needed} more Sensei reactions needed`;
      }
    } else if (stats.currentRole === Role.Kohai && stats.senpaiScore) {
      // Kōhai: show combined Senpai+Sensei stats (both count for promotion)
      const score = stats.senpaiScore;
      const totalEligible = roleCounts.senpai + roleCounts.sensei;
      const pct = totalEligible > 0 ? Math.round((score.uniqueReactors / totalEligible) * 100) : 0;

      message += `**:dojo: Reactions:**\n`;
      message += `  ${score.totalReactions} reactions from ${pct}% of Senpai/Sensei\n\n`;

      if (score.meetsThreshold && score.meetsUnique) {
        message += `**Status:** Ready for Senpai ✅`;
      } else {
        message += `**To Advance:** `;
        const needs: string[] = [];
        if (!score.meetsThreshold) {
          needs.push(`${score.threshold - score.totalReactions} more reactions`);
        }
        if (!score.meetsUnique) {
          needs.push(`${score.uniqueRequired - score.uniqueReactors} more unique Senpai/Sensei`);
        }
        message += needs.join(' and ');
      }
    } else if (stats.currentRole === Role.Senpai && stats.senseiScore) {
      // Senpai: show Sensei-only stats within decay window (only Sensei count for promotion)
      const senseiBreakdown = await getDetailedSenseiBreakdown(
        targetUser.id,
        config.decayWindowDays
      );
      const pct =
        roleCounts.sensei > 0
          ? Math.round((senseiBreakdown.uniqueReactors / roleCounts.sensei) * 100)
          : 0;

      message += `**:dojo: Reactions:**\n`;
      message += `  ${senseiBreakdown.reactions} reactions from ${pct}% of Sensei in the last ${config.decayWindowDays} days\n\n`;

      const score = stats.senseiScore;
      // Use time-windowed data for advancement check
      const meetsThreshold = senseiBreakdown.reactions >= score.threshold;
      const meetsUnique = senseiBreakdown.uniqueReactors >= score.uniqueRequired;

      if (meetsThreshold && meetsUnique) {
        message += `**Status:** Ready for Sensei ✅`;
      } else {
        message += `**To Advance:** `;
        const needs: string[] = [];
        if (!meetsThreshold) {
          needs.push(`${score.threshold - senseiBreakdown.reactions} more Sensei reactions`);
        }
        if (!meetsUnique) {
          needs.push(`${score.uniqueRequired - senseiBreakdown.uniqueReactors} more unique Sensei`);
        }
        message += needs.join(' and ');
      }
    }

    await interaction.editReply(message);
    console.log(`Stats command executed by ${interaction.user.tag} for ${targetUser.tag}`);
  } catch (error) {
    console.error('Error executing stats command:', error);
    await interaction.editReply('An error occurred while fetching stats.');
  }
}
