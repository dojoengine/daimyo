/**
 * Discord REST API client for resolving user profiles.
 * Uses bot token auth with in-memory TTL cache.
 */

interface DiscordUserProfile {
  id: string;
  username: string;
  avatar: string | null;
}

interface CacheEntry {
  profile: DiscordUserProfile;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

function getBotToken(): string | undefined {
  return process.env.DISCORD_BOT_TOKEN;
}

function avatarUrl(userId: string, hash: string | null): string | undefined {
  if (!hash) return undefined;
  return `https://cdn.discordapp.com/avatars/${userId}/${hash}.png`;
}

async function fetchDiscordUser(userId: string, token: string): Promise<DiscordUserProfile | null> {
  const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
    headers: { Authorization: `Bot ${token}` },
  });

  if (!res.ok) return null;
  return (await res.json()) as DiscordUserProfile;
}

export interface ResolvedJudge {
  id: string;
  username: string;
  avatar?: string;
}

/**
 * Resolve Discord user profiles for a list of user IDs.
 * Returns a map of userId -> resolved profile.
 * Missing/failed lookups are omitted from the result.
 */
export async function resolveUsers(userIds: string[]): Promise<Map<string, ResolvedJudge>> {
  const token = getBotToken();
  const result = new Map<string, ResolvedJudge>();

  // In dev bypass mode, resolve the fake user directly
  if (process.env.DEV_AUTH_BYPASS === 'true') {
    for (const id of userIds) {
      if (id === 'dev-user-123') {
        result.set(id, { id, username: 'DevSensei' });
      }
    }
    if (!token) return result;
  }

  if (!token) return result;

  const now = Date.now();

  // Separate cached vs uncached
  const uncached: string[] = [];
  for (const id of userIds) {
    const entry = cache.get(id);
    if (entry && entry.expiresAt > now) {
      result.set(id, {
        id: entry.profile.id,
        username: entry.profile.username,
        avatar: avatarUrl(entry.profile.id, entry.profile.avatar),
      });
    } else {
      uncached.push(id);
    }
  }

  // Fetch uncached in parallel
  const fetches = uncached.map(async (id) => {
    const profile = await fetchDiscordUser(id, token);
    if (profile) {
      cache.set(id, { profile, expiresAt: now + CACHE_TTL_MS });
      result.set(id, {
        id: profile.id,
        username: profile.username,
        avatar: avatarUrl(profile.id, profile.avatar),
      });
    }
  });

  await Promise.all(fetches);
  return result;
}
