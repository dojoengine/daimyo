/**
 * Shared auth-related environment accessors for API routes and middleware.
 */
export interface DiscordOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  senseiRoleId?: string;
  guildId?: string;
}

/**
 * Session signing secret used by JWT middleware and OAuth flows.
 */
export function getSessionSecret(): string {
  return process.env.DISCORD_SESSION_SECRET || 'dev-secret-change-in-production';
}

/**
 * Enables local development bypass for auth-protected routes.
 */
export function isDevAuthBypass(): boolean {
  return process.env.DEV_AUTH_BYPASS === 'true';
}

/**
 * Discord OAuth and guild role configuration used by `/api/auth` routes.
 */
export function getDiscordOAuthConfig(): DiscordOAuthConfig {
  return {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    senseiRoleId: process.env.SENSEI_ROLE_ID,
    guildId: process.env.DISCORD_GUILD_ID,
  };
}
