import { config as dotenvConfig } from 'dotenv';
import { Config } from '../types.js';

// Load environment variables from .env file
dotenvConfig();

/**
 * Get required environment variable or throw error
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable
 */
function getOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

/**
 * Get environment variable as number with default
 */
function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
  }
  return parsed;
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  return {
    // Discord
    discordBotToken: getRequiredEnv('DISCORD_BOT_TOKEN'),
    discordGuildId: getRequiredEnv('DISCORD_GUILD_ID'),
    discordClientId: getRequiredEnv('DISCORD_CLIENT_ID'),

    // Emoji
    dojoEmojiName: getRequiredEnv('DOJO_EMOJI_NAME'),
    dojoEmojiId: getOptionalEnv('DOJO_EMOJI_ID'),

    // Role IDs
    kohaiRoleId: getRequiredEnv('KOHAI_ROLE_ID'),
    senpaiRoleId: getRequiredEnv('SENPAI_ROLE_ID'),
    senseiRoleId: getRequiredEnv('SENSEI_ROLE_ID'),
    feltRoleId: getRequiredEnv('FELT_ROLE_ID'),

    // Channel IDs
    ohayoChannelId: getRequiredEnv('OHAYO_CHANNEL_ID'),

    // Database
    databaseUrl: getRequiredEnv('DATABASE_URL'),

    // Decay
    decayCheckCron: process.env.DECAY_CHECK_CRON || '',
    decayWindowDays: getNumberEnv('DECAY_WINDOW_DAYS', 360),
    senpaiReactionThreshold: getNumberEnv('SENPAI_REACTION_THRESHOLD', 50),
    senpaiUniquePercent: getNumberEnv('SENPAI_UNIQUE_PERCENT', 0.1),
    senseiReactionThreshold: getNumberEnv('SENSEI_REACTION_THRESHOLD', 30),
    senseiUniquePercent: getNumberEnv('SENSEI_UNIQUE_PERCENT', 0.2),

    // Content Pipeline
    contentChannelIds: (getOptionalEnv('CONTENT_CHANNEL_IDS') || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
    contentPipelineDaysBack: getNumberEnv('CONTENT_PIPELINE_DAYS_BACK', 7),
    contentPipelineMinStories: getNumberEnv('CONTENT_PIPELINE_MIN_STORIES', 3),
    contentPipelineMaxStories: getNumberEnv('CONTENT_PIPELINE_MAX_STORIES', 10),
    contentPipelineCron: process.env.CONTENT_PIPELINE_CRON || '',

    // AI Configuration
    llmModel: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
    anthropicApiKey: getOptionalEnv('ANTHROPIC_API_KEY') || '',
    openaiApiKey: getOptionalEnv('OPENAI_API_KEY') || '',

    // Typefully
    typefullyApiKey: getOptionalEnv('TYPEFULLY_API_KEY') || '',
    typefullySocialSetId: getOptionalEnv('TYPEFULLY_SOCIAL_SET_ID') || '',
  };
}

// Export singleton config instance
export const config = loadConfig();
