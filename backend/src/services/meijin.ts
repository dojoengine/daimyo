import { Guild } from 'discord.js';
import { config } from '../utils/config.js';
import { getTopSenseiReactionRecipients } from './database.js';
import { sendDM } from './roleManager.js';

/**
 * Result of the Meijin check
 */
export interface MeijinCheckResult {
  newMeijin: string[];
  removedMeijin: string[];
  topCount: number;
}

/**
 * Check and update Meijin role assignments
 * Meijin goes to whoever has the most Sensei reactions in the last 30 days
 * Ties share the role
 */
export async function checkAndUpdateMeijin(guild: Guild): Promise<MeijinCheckResult> {
  const result: MeijinCheckResult = {
    newMeijin: [],
    removedMeijin: [],
    topCount: 0,
  };

  try {
    // Get current Meijin holders
    const meijinRole = guild.roles.cache.get(config.meijinRoleId);
    if (!meijinRole) {
      console.error('Meijin role not found in guild');
      return result;
    }

    const currentMeijin = new Set(meijinRole.members.map((m) => m.id));

    // Get top Sensei reaction recipients
    const topRecipients = await getTopSenseiReactionRecipients(config.meijinWindowDays);
    const newMeijinSet = new Set(topRecipients.map((r) => r.user_id));

    if (topRecipients.length > 0) {
      result.topCount = topRecipients[0].reaction_count;
    }

    console.log(
      `Meijin check: ${topRecipients.length} user(s) with ${result.topCount} Sensei reactions in last ${config.meijinWindowDays} days`
    );

    // Remove Meijin from those who no longer qualify
    for (const userId of currentMeijin) {
      if (!newMeijinSet.has(userId)) {
        const member = guild.members.cache.get(userId);
        if (member) {
          await member.roles.remove(config.meijinRoleId);
          result.removedMeijin.push(userId);
          console.log(`Removed Meijin from ${member.user.tag} (${userId})`);

          await sendDM(
            member.user,
            `🎌 Your **Meijin** title has passed to another.\n\nThe Meijin title goes to whoever receives the most Sensei reactions in a rolling 30-day window. Keep contributing to reclaim it!`
          );
        }
      }
    }

    // Add Meijin to new qualifiers
    for (const userId of newMeijinSet) {
      if (!currentMeijin.has(userId)) {
        const member = guild.members.cache.get(userId);
        if (member) {
          await member.roles.add(config.meijinRoleId);
          result.newMeijin.push(userId);
          console.log(`Added Meijin to ${member.user.tag} (${userId})`);

          await sendDM(
            member.user,
            `🎌 Congratulations! You've been recognized as **Meijin**!\n\nYou received the most Sensei reactions in the last 30 days (${result.topCount} reactions). This title reflects your current excellence in the community.\n\n*The Meijin title is checked monthly and goes to whoever has the highest Sensei reaction count.*`
          );
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error checking/updating Meijin:', error);
    return result;
  }
}
