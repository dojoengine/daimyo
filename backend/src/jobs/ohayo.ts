import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { config } from '../utils/config.js';

/**
 * Send "Ohayo!" message to the configured channel
 */
async function runOhayo(client: Client): Promise<void> {
  console.log('🌅 Running weekly ohayo greeting...');

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
 */
export function startOhayoJob(client: Client): void {
  const cronSchedule = config.ohayoCron;

  console.log(`⏰ Scheduling ohayo greeting: ${cronSchedule}`);

  cron.schedule(cronSchedule, () => {
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
