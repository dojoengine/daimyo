/**
 * Core types for the Daimyō reputation system
 */

/**
 * Role hierarchy in the reputation system
 */
export enum Role {
  Kohai = 'Kohai',
  Senpai = 'Senpai',
  Sensei = 'Sensei',
  Meijin = 'Meijin',
}

/**
 * Reaction record stored in database
 */
export interface Reaction {
  id: number;
  message_id: string;
  author_id: string;
  reactor_id: string;
  reactor_role: Role;
  timestamp: number;
}

/**
 * Configuration loaded from environment variables
 */
export interface Config {
  // Discord
  discordBotToken: string;
  discordGuildId: string;
  discordClientId: string;

  // Emoji
  dojoEmojiName: string;
  dojoEmojiId?: string;

  // Role IDs
  kohaiRoleId: string;
  senpaiRoleId: string;
  senseiRoleId: string;
  meijinRoleId: string;
  feltRoleId: string;
  teamRoleId: string;

  // Channel IDs
  ohayoChannelId: string;

  // Database
  databaseUrl: string;

  // Decay
  decayCheckCron: string;
  decayWindowDays: number;
  senpaiReactionThreshold: number;
  senpaiUniquePercent: number;
  senseiReactionThreshold: number;
  senseiUniquePercent: number;

  // Meijin
  meijinWindowDays: number;

  // Content Pipeline
  contentChannelIds: string[];
  contentPipelineDaysBack: number;
  contentPipelineMinStories: number;
  contentPipelineMaxStories: number;
  contentPipelineCron: string;

  // AI Configuration
  llmModel: string;
  anthropicApiKey: string;
  openaiApiKey: string;

  // Typefully
  typefullyApiKey: string;
  typefullySocialSetId: string;
}

/**
 * Reputation score calculation result
 */
export interface ReputationScore {
  totalReactions: number;
  uniqueReactors: number;
  threshold: number;
  uniqueRequired: number;
  meetsThreshold: boolean;
  meetsUnique: boolean;
}

/**
 * Breakdown of reactions by role for stats display
 */
export interface ReactionBreakdown {
  total: number;
  fromKohai: number;
  fromSenpai: number;
  fromSensei: number;
}

/**
 * Promotion check result
 */
export interface PromotionResult {
  promoted: boolean;
  newRole?: Role;
  oldRole?: Role;
}

/**
 * Demotion check result
 */
export interface DemotionResult {
  demoted: boolean;
  newRole?: Role;
  oldRole?: Role;
}

/**
 * Role counts in the guild
 */
export interface RoleCounts {
  kohai: number;
  senpai: number;
  sensei: number;
  meijin: number;
}

// ============================================
// Content Pipeline Types
// ============================================

/**
 * Discord message data for content pipeline
 */
export interface DiscordMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: number;
  channelId: string;
  channelName: string;
  url: string;
}

/**
 * Identified story from Discord messages
 */
export interface Story {
  id: string;
  title: string;
  summary: string;
  sourceMessages: DiscordMessage[];
  confidence: number;
  suggestedImagePrompt: string;
}

/**
 * Generated Twitter thread content
 */
export interface ThreadContent {
  tweets: string[];
  hashtags: string[];
}

/**
 * Generated image result
 */
export interface GeneratedImage {
  url: string;
  prompt: string;
}

/**
 * Complete thread draft ready for publishing
 */
export interface ThreadDraft {
  story: Story;
  content: ThreadContent;
  image?: GeneratedImage;
  createdAt: number;
}

/**
 * Result of publishing a draft
 */
export interface PublishResult {
  success: boolean;
  draftId?: string;
  error?: string;
}
