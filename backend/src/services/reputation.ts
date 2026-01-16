import { Guild } from 'discord.js';
import { config } from '../utils/config.js';
import { Role, ReputationScore, PromotionResult } from '../types.js';
import {
  getReactionCount,
  getUniqueReactors,
  insertRoleHistory,
  getReactionBreakdown,
} from './database.js';
import {
  getUserRole,
  assignRole,
  getRoleCounts,
  sendDM,
  formatPromotionMessage,
} from './roleManager.js';

/**
 * Calculate Senpai promotion score for a user
 * Requirements: 50 reactions from 10% unique Senpai+Sensei
 */
export async function calculateSenpaiScore(guild: Guild, userId: string): Promise<ReputationScore> {
  const validRoles = [Role.Senpai, Role.Sensei];
  const reactionCount = await getReactionCount(userId, validRoles);
  const uniqueReactors = await getUniqueReactors(userId, validRoles);
  const uniqueReactorCount = uniqueReactors.length;

  // Get total Senpai + Sensei count from guild
  const roleCounts = getRoleCounts(guild);
  const totalEligibleReactors = roleCounts.senpai + roleCounts.sensei;

  // Calculate required unique reactors (CEIL of 10%)
  const uniqueRequired = Math.max(1, Math.ceil(totalEligibleReactors * config.senpaiUniquePercent));

  const threshold = config.senpaiReactionThreshold;
  const meetsThreshold = reactionCount >= threshold;
  const meetsUnique = uniqueReactorCount >= uniqueRequired;

  return {
    totalReactions: reactionCount,
    uniqueReactors: uniqueReactorCount,
    threshold,
    uniqueRequired,
    meetsThreshold,
    meetsUnique,
  };
}

/**
 * Calculate Sensei promotion score for a user
 * Requirements: 30 reactions from 20% unique Sensei
 */
export async function calculateSenseiScore(guild: Guild, userId: string): Promise<ReputationScore> {
  const validRoles = [Role.Sensei];
  const reactionCount = await getReactionCount(userId, validRoles);
  const uniqueReactors = await getUniqueReactors(userId, validRoles);
  const uniqueReactorCount = uniqueReactors.length;

  // Get total Sensei count from guild
  const roleCounts = getRoleCounts(guild);
  const totalEligibleReactors = roleCounts.sensei;

  // Calculate required unique reactors (CEIL of 20%)
  const uniqueRequired = Math.max(1, Math.ceil(totalEligibleReactors * config.senseiUniquePercent));

  const threshold = config.senseiReactionThreshold;
  const meetsThreshold = reactionCount >= threshold;
  const meetsUnique = uniqueReactorCount >= uniqueRequired;

  return {
    totalReactions: reactionCount,
    uniqueReactors: uniqueReactorCount,
    threshold,
    uniqueRequired,
    meetsThreshold,
    meetsUnique,
  };
}

/**
 * Check if a user is eligible for promotion and promote if so
 */
export async function checkPromotion(guild: Guild, userId: string): Promise<PromotionResult> {
  try {
    const currentRole = getUserRole(guild, userId);

    if (!currentRole) {
      console.warn(`User ${userId} has no reputation role, skipping promotion check`);
      return { promoted: false };
    }

    // Check for Kohai -> Senpai promotion
    if (currentRole === Role.Kohai) {
      const score = await calculateSenpaiScore(guild, userId);

      if (score.meetsThreshold && score.meetsUnique) {
        console.log(
          `Promoting ${userId} from Kohai to Senpai (${score.totalReactions}/${score.threshold} reactions, ${score.uniqueReactors}/${score.uniqueRequired} unique)`
        );

        await assignRole(guild, userId, Role.Senpai);
        await insertRoleHistory(userId, Role.Senpai, 'promotion');

        // Send DM notification
        const member = guild.members.cache.get(userId);
        if (member) {
          await sendDM(member.user, formatPromotionMessage(Role.Senpai));
        }

        return {
          promoted: true,
          oldRole: Role.Kohai,
          newRole: Role.Senpai,
        };
      }
    }

    // Check for Senpai -> Sensei promotion
    if (currentRole === Role.Senpai) {
      const score = await calculateSenseiScore(guild, userId);

      if (score.meetsThreshold && score.meetsUnique) {
        console.log(
          `Promoting ${userId} from Senpai to Sensei (${score.totalReactions}/${score.threshold} reactions, ${score.uniqueReactors}/${score.uniqueRequired} unique)`
        );

        await assignRole(guild, userId, Role.Sensei);
        await insertRoleHistory(userId, Role.Sensei, 'promotion');

        // Send DM notification
        const member = guild.members.cache.get(userId);
        if (member) {
          await sendDM(member.user, formatPromotionMessage(Role.Sensei));
        }

        return {
          promoted: true,
          oldRole: Role.Senpai,
          newRole: Role.Sensei,
        };
      }
    }

    // No promotion
    return { promoted: false };
  } catch (error) {
    console.error(`Error checking promotion for ${userId}:`, error);
    return { promoted: false };
  }
}

/**
 * Get detailed reaction statistics for a user
 */
export interface UserStats {
  userId: string;
  currentRole: Role | null;
  breakdown: {
    total: number;
    fromKohai: number;
    fromSenpai: number;
    fromSensei: number;
  };
  senpaiScore?: ReputationScore;
  senseiScore?: ReputationScore;
}

export async function getUserStats(guild: Guild, userId: string): Promise<UserStats> {
  const currentRole = getUserRole(guild, userId);
  const breakdown = await getReactionBreakdown(userId);

  const stats: UserStats = {
    userId,
    currentRole,
    breakdown,
  };

  // Include relevant scores based on current role
  if (currentRole === Role.Kohai) {
    stats.senpaiScore = await calculateSenpaiScore(guild, userId);
  } else if (currentRole === Role.Senpai) {
    stats.senseiScore = await calculateSenseiScore(guild, userId);
  }

  return stats;
}
