import { REST, Routes } from 'discord.js';
import { config } from '../utils/config.js';

// Import all command data
import * as statsCommand from '../commands/stats.js';
import * as leaderboardCommand from '../commands/leaderboard.js';
import * as syncCommand from '../commands/sync.js';
import * as auditCommand from '../commands/audit.js';

/**
 * Deploy slash commands to Discord
 * Run this script whenever command definitions change
 */
async function deployCommands() {
  console.log('🚀 Starting command deployment...');

  // Collect all command data
  const commands = [
    statsCommand.data.toJSON(),
    leaderboardCommand.data.toJSON(),
    syncCommand.data.toJSON(),
    auditCommand.data.toJSON(),
  ];

  console.log(`Deploying ${commands.length} commands...`);

  try {
    // Create REST client
    const rest = new REST({ version: '10' }).setToken(config.discordBotToken);

    // Deploy commands to specific guild (faster for development)
    // For production, you can deploy globally by using Routes.applicationCommands(clientId)
    console.log(`Deploying to guild: ${config.discordGuildId}`);

    const data = (await rest.put(
      Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId),
      { body: commands }
    )) as unknown[];

    console.log(`✅ Successfully deployed ${data.length} commands!`);

    // Log deployed commands
    for (const command of commands) {
      console.log(`  - /${command.name}: ${command.description}`);
    }

    console.log('\n📝 Commands are now available in your Discord server!');
    console.log(
      'Note: Guild commands update instantly. Global commands can take up to 1 hour to propagate.'
    );
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

// Run deployment
deployCommands();
