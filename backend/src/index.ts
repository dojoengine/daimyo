import {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
  ChatInputCommandInteraction,
} from 'discord.js';
import { config } from './utils/config.js';
import { initializeDatabase, closeDatabase } from './services/database.js';
import { registerReadyHandler } from './events/ready.js';
import { registerGuildMemberAddHandler } from './events/guildMemberAdd.js';
import { registerMessageReactionAddHandler } from './events/messageReactionAdd.js';
import { startDecayCheckJob } from './jobs/decayCheck.js';
import { startOhayoJob } from './jobs/ohayo.js';

// Import all commands
import * as statsCommand from './commands/stats.js';
import * as leaderboardCommand from './commands/leaderboard.js';
import * as syncCommand from './commands/sync.js';
import * as auditCommand from './commands/audit.js';

// Extend Client type to include commands collection
interface BotClient extends Client {
  commands: Collection<
    string,
    { execute: (interaction: ChatInputCommandInteraction) => Promise<void> }
  >;
}

/**
 * Main entry point for the Daimyō bot
 */
async function main() {
  console.log('🚀 Starting Daimyō bot...');

  try {
    // Initialize database
    initializeDatabase();

    // Create Discord client with required intents
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
      ],
      // Enable partial structures for reactions on uncached messages
      partials: [],
    }) as BotClient;

    // Initialize commands collection
    client.commands = new Collection();
    client.commands.set(statsCommand.data.name, statsCommand);
    client.commands.set(leaderboardCommand.data.name, leaderboardCommand);
    client.commands.set(syncCommand.data.name, syncCommand);
    client.commands.set(auditCommand.data.name, auditCommand);

    console.log(`Registered ${client.commands.size} commands`);

    // Register event handlers
    registerReadyHandler(client);
    registerGuildMemberAddHandler(client);
    registerMessageReactionAddHandler(client);

    // Register interaction handler for slash commands
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.warn(`Unknown command: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);

        const errorMessage = 'There was an error executing this command!';

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
    });

    // Start cron jobs
    startDecayCheckJob(client);
    startOhayoJob(client);

    // Login to Discord
    await client.login(config.discordBotToken);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully...');
      closeDatabase();
      client.destroy();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      closeDatabase();
      client.destroy();
      process.exit(0);
    });
  } catch (error) {
    console.error('Fatal error during bot startup:', error);
    closeDatabase();
    process.exit(1);
  }
}

// Start the bot
main();
