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
}

/**
 * Reaction record stored in database
 */
export interface Reaction {
  id: string;
  message_id: string;
  message_author_id: string;
  reactor_id: string;
  reactor_role_at_time: Role;
  timestamp: number;
}

/**
 * Role history record for audit trail
 */
export interface RoleHistory {
  id: string;
  user_id: string;
  role: Role;
  reason: 'promotion' | 'demotion' | 'decay' | 'manual';
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

  // Channel IDs
  ohayoChannelId: string;

  // Database
  databaseUrl: string;

  // Thresholds
  decayWindowDays: number;
  senpaiReactionThreshold: number;
  senpaiUniquePercent: number;
  senseiReactionThreshold: number;
  senseiUniquePercent: number;

  // Content Pipeline
  contentChannelIds: string[];
  contentPipelineDaysBack: number;
  contentPipelineMinStories: number;
  contentPipelineMaxStories: number;
  contentPipelineCron: string;

  // AI Providers
  llmProvider: 'openai' | 'anthropic';
  llmModel: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  imageProvider: 'dalle' | 'replicate';
  replicateApiKey: string;

  // Typefully
  typefullyApiKey: string;
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

/**
 * Content pipeline run record
 */
export interface PipelineRun {
  id: string;
  startedAt: number;
  completedAt?: number;
  messagesScanned: number;
  storiesIdentified: number;
  draftsCreated: number;
  draftsFailed: number;
  error?: string;
}

/**
 * Stored story record from database
 */
export interface StoredStory {
  id: string;
  title: string;
  summary: string;
  source_message_ids: string;
  source_channel_id: string;
  confidence: number;
  created_at: number;
}

/**
 * Stored draft record from database
 */
export interface StoredDraft {
  id: string;
  story_id: string;
  tweets: string;
  image_prompt: string;
  image_url: string;
  typefully_draft_id?: string;
  status: 'pending' | 'submitted' | 'failed';
  created_at: number;
}
