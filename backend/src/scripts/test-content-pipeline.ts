import { Client, GatewayIntentBits } from 'discord.js';
import { config } from '../utils/config.js';
import { runContentPipelineNow } from '../jobs/contentPipeline.js';

// Pass --upload to actually submit to Typefully
const upload = process.argv.includes('--upload');

async function main() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}`);

    try {
      // Dry run by default, pass --upload to submit to Typefully
      await runContentPipelineNow(client, !upload);
    } catch (error) {
      console.error('Error running content pipeline:', error);
    } finally {
      console.log('Done, exiting...');
      client.destroy();
      process.exit(0);
    }
  });

  await client.login(config.discordBotToken);
}

main().catch(console.error);
