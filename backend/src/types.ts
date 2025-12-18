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

  // Database
  databasePath: string;

  // Thresholds
  decayWindowDays: number;
  senpaiReactionThreshold: number;
  senpaiUniquePercent: number;
  senseiReactionThreshold: number;
  senseiUniquePercent: number;
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
