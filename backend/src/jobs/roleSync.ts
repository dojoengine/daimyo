import cron from 'node-cron';
import { Client } from 'discord.js';
import { config } from '../utils/config.js';
import { getUsersWithRole, ensureAutoSenseiRoles } from '../services/roleManager.js';
import { checkSenseiDecay } from '../services/decay.js';
import { checkPromotion } from '../services/reputation.js';
import { checkAndUpdateMeijin } from '../services/meijin.js';
import { Role } from '../types.js';

/**
 * Run monthly role sync: auto-Sensei, promotions, decay, and Meijin rotation
 */
async function runRoleSync(client: Client): Promise<void> {
  console.log('🕐 Starting role sync...');

  try {
    const guild = await client.guilds.fetch(config.discordGuildId);

    // Fetch all members to ensure cache is up to date
    await guild.members.fetch();

    let demotionCount = 0;
    let promotionCount = 0;

    // 1. Ensure auto-Sensei role holders have Sensei
    const autoPromoted = await ensureAutoSenseiRoles(guild);
    promotionCount += autoPromoted.length;

    // 2. Check all members for pending promotions
    console.log('Checking for pending promotions...');

    for (const [userId, member] of guild.members.cache) {
      if (member.user.bot) continue;

      const result = await checkPromotion(guild, userId);
      if (result.promoted) {
        promotionCount++;
        console.log(`Promoted: ${member.user.tag} (${member.id}) to ${result.newRole}`);
      }
    }

    // 3. Check all Sensei for decay
    const senseiMembers = getUsersWithRole(guild, Role.Sensei);
    console.log(`Checking ${senseiMembers.length} Sensei for decay...`);

    for (const member of senseiMembers) {
      const result = await checkSenseiDecay(guild, member.id);
      if (result.demoted) {
        demotionCount++;
        console.log(`Decayed: ${member.user.tag} (${member.id})`);
      }
    }

    // 4. Check and update Meijin title
    console.log('Checking Meijin title...');
    const meijinResult = await checkAndUpdateMeijin(guild);

    console.log(
      `✅ Role sync complete: ${promotionCount} promotions, ${demotionCount} demotions, ${meijinResult.newMeijin.length} new Meijin, ${meijinResult.removedMeijin.length} removed Meijin`
    );
  } catch (error) {
    console.error('Error during role sync:', error);
  }
}

/**
 * Schedule and start the role sync cron job
 */
export function startRoleSyncJob(client: Client): void {
  const cronSchedule = config.roleSyncCron;

  if (!cronSchedule) {
    console.log('⏰ Role sync not scheduled (ROLE_SYNC_CRON not set)');
    return;
  }

  console.log(`⏰ Scheduling role sync: ${cronSchedule}`);

  cron.schedule(cronSchedule, () => {
    runRoleSync(client);
  });

  console.log('✅ Role sync job scheduled');
}

/**
 * Run role sync immediately (for testing)
 */
export async function runRoleSyncNow(client: Client): Promise<void> {
  console.log('Running role sync immediately (manual trigger)...');
  await runRoleSync(client);
}
