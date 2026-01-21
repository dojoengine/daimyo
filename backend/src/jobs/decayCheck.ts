import cron from 'node-cron';
import { Client } from 'discord.js';
import { config } from '../utils/config.js';
import { getUsersWithRole } from '../services/roleManager.js';
import { checkSenseiDecay } from '../services/decay.js';
import { checkPromotion } from '../services/reputation.js';
import { Role } from '../types.js';

/**
 * Run monthly decay check for all Sensei
 * Also checks for any pending promotions
 */
async function runDecayCheck(client: Client): Promise<void> {
  console.log('🕐 Starting daily decay check...');

  try {
    const guild = await client.guilds.fetch(config.discordGuildId);

    // Fetch all members to ensure cache is up to date
    await guild.members.fetch();

    let demotionCount = 0;
    let promotionCount = 0;

    // Check all Sensei for decay
    const senseiMembers = getUsersWithRole(guild, Role.Sensei);
    console.log(`Checking ${senseiMembers.length} Sensei for decay...`);

    for (const member of senseiMembers) {
      const result = await checkSenseiDecay(guild, member.id);
      if (result.demoted) {
        demotionCount++;
        console.log(`Decayed: ${member.user.tag} (${member.id})`);
      }
    }

    // Also check all members for pending promotions
    // This catches anyone who might have hit thresholds between reactions
    console.log('Checking for pending promotions...');

    for (const [userId, member] of guild.members.cache) {
      if (member.user.bot) continue;

      const result = await checkPromotion(guild, userId);
      if (result.promoted) {
        promotionCount++;
        console.log(`Promoted: ${member.user.tag} (${member.id}) to ${result.newRole}`);
      }
    }

    console.log(
      `✅ Decay check complete: ${demotionCount} demotions, ${promotionCount} promotions`
    );
  } catch (error) {
    console.error('Error during decay check:', error);
  }
}

/**
 * Schedule and start the decay check cron job
 * Runs monthly at 12:00 UTC on the 1st (0 12 1 * *)
 * Set DECAY_CHECK_ENABLED=true to enable
 */
export function startDecayCheckJob(client: Client): void {
  const enabled = process.env.DECAY_CHECK_ENABLED === 'true';

  if (!enabled) {
    console.log('⏰ Decay check job disabled (set DECAY_CHECK_ENABLED=true to enable)');
    return;
  }

  console.log('⏰ Scheduling monthly decay check for 12:00 UTC on the 1st (0 12 1 * *)');

  // Schedule: minute hour day month dayOfWeek
  // 0 12 1 * * = 12:00 UTC on the 1st of every month
  cron.schedule('0 12 1 * *', () => {
    runDecayCheck(client);
  });

  console.log('✅ Decay check job scheduled');
}

/**
 * Run decay check immediately (for testing)
 */
export async function runDecayCheckNow(client: Client): Promise<void> {
  console.log('Running decay check immediately (manual trigger)...');
  await runDecayCheck(client);
}
