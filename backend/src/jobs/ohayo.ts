import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { config } from '../utils/config.js';

/**
 * Send "Ohayo!" message to the configured channel
 */
async function runOhayo(client: Client): Promise<void> {
  console.log('🌅 Running daily ohayo greeting...');

  try {
    const channel = await client.channels.fetch(config.ohayoChannelId);

    if (!channel) {
      console.warn(`⚠️ Ohayo channel (${config.ohayoChannelId}) not found`);
      return;
    }

    if (!channel.isTextBased()) {
      console.warn(`⚠️ Ohayo channel (${config.ohayoChannelId}) is not a text channel`);
      return;
    }

    await (channel as TextChannel).send('Ohayo!');
    console.log('✅ Ohayo message sent successfully');
  } catch (error) {
    console.error('Error sending ohayo message:', error);
  }
}

/**
 * Schedule and start the ohayo cron job
 * Runs every day at 12:00 UTC (0 12 * * *)
 */
export function startOhayoJob(client: Client): void {
  console.log('⏰ Scheduling daily ohayo greeting for 12:00 UTC (0 12 * * *)');

  // Schedule: minute hour day month dayOfWeek
  // 0 12 * * * = Every day at 12:00 UTC
  cron.schedule('0 12 * * *', () => {
    runOhayo(client);
  });

  console.log('✅ Ohayo job scheduled');
}

/**
 * Run ohayo immediately (for testing)
 */
export async function runOhayoNow(client: Client): Promise<void> {
  console.log('Running ohayo immediately (manual trigger)...');
  await runOhayo(client);
}
