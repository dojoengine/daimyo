import { Client, GatewayIntentBits } from 'discord.js';
import { config } from '../utils/config.js';
import { runOhayoNow } from '../jobs/ohayo.js';

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}`);
    await runOhayoNow(client);
    console.log('Done, exiting...');
    client.destroy();
    process.exit(0);
  });

  await client.login(config.discordBotToken);
}

main().catch(console.error);
