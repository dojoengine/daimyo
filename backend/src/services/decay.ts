import { Guild } from 'discord.js';
import { config } from '../utils/config.js';
import { Role, DemotionResult } from '../types.js';
import { getRecentSenseiReactions, insertRoleHistory } from './database.js';
import { getUserRole, assignRole, sendDM, formatDemotionMessage } from './roleManager.js';

/**
 * Check if a Sensei should be demoted due to insufficient recent reactions
 * Sensei must maintain 30+ Sensei reactions within the last 360 days
 */
export async function checkSenseiDecay(guild: Guild, userId: string): Promise<DemotionResult> {
  try {
    const currentRole = getUserRole(guild, userId);

    // Only check Sensei for decay
    if (currentRole !== Role.Sensei) {
      return { demoted: false };
    }

    // Get Sensei reactions within the decay window
    const recentReactions = await getRecentSenseiReactions(userId, config.decayWindowDays);
    const recentCount = recentReactions.length;

    console.debug(
      `Checking decay for Sensei ${userId}: ${recentCount} reactions in last ${config.decayWindowDays} days`
    );

    // Check if below threshold
    if (recentCount < config.senseiReactionThreshold) {
      console.log(
        `Demoting ${userId} from Sensei to Senpai due to decay (${recentCount}/${config.senseiReactionThreshold} recent reactions)`
      );

      // Demote to Senpai
      await assignRole(guild, userId, Role.Senpai);
      await insertRoleHistory(userId, Role.Senpai, 'decay');

      // Send DM notification
      const member = guild.members.cache.get(userId);
      if (member) {
        const reason = `Your Sensei reactions within the last ${config.decayWindowDays} days (${recentCount}) fell below the required threshold (${config.senseiReactionThreshold}).`;
        await sendDM(member.user, formatDemotionMessage(Role.Sensei, Role.Senpai, reason));
      }

      return {
        demoted: true,
        oldRole: Role.Sensei,
        newRole: Role.Senpai,
      };
    }

    // No demotion needed
    return { demoted: false };
  } catch (error) {
    console.error(`Error checking decay for ${userId}:`, error);
    return { demoted: false };
  }
}

/**
 * Get time-windowed Sensei reaction count for display
 */
export async function getSenseiDecayStatus(userId: string): Promise<{
  recentCount: number;
  threshold: number;
  windowDays: number;
}> {
  const recentReactions = await getRecentSenseiReactions(userId, config.decayWindowDays);

  return {
    recentCount: recentReactions.length,
    threshold: config.senseiReactionThreshold,
    windowDays: config.decayWindowDays,
  };
}
