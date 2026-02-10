import postgres, { Sql } from 'postgres';
import { config } from '../utils/config.js';
import { Reaction, Role } from '../types.js';
import { randomUUID } from 'crypto';

let sql: Sql;

/**
 * Initialize database connection
 * @param databaseUrl - PostgreSQL connection string (if not provided, uses config)
 */
export async function initializeDatabase(databaseUrl?: string): Promise<void> {
  console.log('Initializing PostgreSQL database connection...');

  // Dynamically import config only if URL not provided
  if (!databaseUrl) {
    const { config } = await import('../utils/config.js');
    databaseUrl = config.databaseUrl;
  }

  sql = postgres(databaseUrl);

  // Verify connection
  await sql`SELECT 1`;

  console.log('Database connection established successfully');
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (sql) {
    await sql.end();
    console.log('Database connection closed');
  }
}

/**
 * Get SQL instance (for testing)
 */
export function getSql(): Sql {
  return sql;
}

/**
 * Set SQL instance (for testing with PGlite)
 */
export function setSql(newSql: Sql): void {
  sql = newSql;
}

// ============================================
// Reputation System Functions
// ============================================

/**
 * Insert a new reaction into the database
 * Returns true if inserted, false if duplicate or self-reaction
 */
export async function insertReaction(
  messageId: string,
  messageAuthorId: string,
  reactorId: string,
  reactorRole: Role
): Promise<boolean> {
  // Reject self-reactions - users cannot endorse their own messages
  if (messageAuthorId === reactorId) {
    console.debug(`Self-reaction ignored: ${reactorId} -> ${messageId}`);
    return false;
  }

  try {
    const timestamp = Date.now();

    await sql`
      INSERT INTO reactions (message_id, author_id, reactor_id, reactor_role, timestamp)
      VALUES (${messageId}, ${messageAuthorId}, ${reactorId}, ${reactorRole}, ${timestamp})
    `;

    return true;
  } catch (error: unknown) {
    // PostgreSQL unique violation error code
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
      console.debug(`Duplicate reaction ignored: ${reactorId} -> ${messageId}`);
      return false;
    }
    throw error;
  }
}

/**
 * Get all reactions received by a user (excludes self-reactions)
 */
export async function getReactionsForUser(userId: string): Promise<Reaction[]> {
  const results = await sql<Reaction[]>`
    SELECT id, message_id, author_id, reactor_id, reactor_role, timestamp
    FROM reactions
    WHERE author_id = ${userId}
    AND author_id != reactor_id
    ORDER BY timestamp DESC
  `;

  return results;
}

/**
 * Get reactions for a user filtered by reactor role(s) (excludes self-reactions)
 */
export async function getReactionsByRole(userId: string, roles: Role[]): Promise<Reaction[]> {
  const results = await sql<Reaction[]>`
    SELECT id, message_id, author_id, reactor_id, reactor_role, timestamp
    FROM reactions
    WHERE author_id = ${userId}
    AND author_id != reactor_id
    AND reactor_role = ANY(${roles})
    ORDER BY timestamp DESC
  `;

  return results;
}

/**
 * Get recent Sensei reactions for a user (within time window, excludes self-reactions)
 */
export async function getRecentSenseiReactions(userId: string, days: number): Promise<Reaction[]> {
  const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;

  const results = await sql<Reaction[]>`
    SELECT id, message_id, author_id, reactor_id, reactor_role, timestamp
    FROM reactions
    WHERE author_id = ${userId}
    AND author_id != reactor_id
    AND reactor_role = 'Sensei'
    AND timestamp >= ${cutoffTimestamp}
    ORDER BY timestamp DESC
  `;

  return results;
}

/**
 * Get unique reactors for a user from specific roles (excludes self-reactions)
 */
export async function getUniqueReactors(userId: string, roles: Role[]): Promise<string[]> {
  const results = await sql<{ reactor_id: string }[]>`
    SELECT DISTINCT reactor_id
    FROM reactions
    WHERE author_id = ${userId}
    AND author_id != reactor_id
    AND reactor_role = ANY(${roles})
  `;

  return results.map((r) => r.reactor_id);
}

/**
 * Get count of reactions for a user from specific roles (excludes self-reactions)
 */
export async function getReactionCount(userId: string, roles: Role[]): Promise<number> {
  const results = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count
    FROM reactions
    WHERE author_id = ${userId}
    AND author_id != reactor_id
    AND reactor_role = ANY(${roles})
  `;

  return parseInt(results[0]?.count || '0', 10);
}

/**
 * Get reaction breakdown by role for a user
 */
export interface ReactionCountsByRole {
  total: number;
  fromKohai: number;
  fromSenpai: number;
  fromSensei: number;
}

export async function getReactionBreakdown(userId: string): Promise<ReactionCountsByRole> {
  const results = await sql<
    { total: string; fromkohai: string; fromsenpai: string; fromsensei: string }[]
  >`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN reactor_role = 'Kohai' THEN 1 ELSE 0 END) as fromKohai,
      SUM(CASE WHEN reactor_role = 'Senpai' THEN 1 ELSE 0 END) as fromSenpai,
      SUM(CASE WHEN reactor_role = 'Sensei' THEN 1 ELSE 0 END) as fromSensei
    FROM reactions
    WHERE author_id = ${userId}
    AND author_id != reactor_id
  `;

  const row = results[0];
  return {
    total: parseInt(row?.total || '0', 10),
    fromKohai: parseInt(row?.fromkohai || '0', 10),
    fromSenpai: parseInt(row?.fromsenpai || '0', 10),
    fromSensei: parseInt(row?.fromsensei || '0', 10),
  };
}

/**
 * Get detailed Sensei reaction breakdown within a time window
 */
export interface DetailedRoleBreakdown {
  reactions: number;
  uniqueReactors: number;
}
export async function getDetailedSenseiBreakdown(
  userId: string,
  days: number
): Promise<DetailedRoleBreakdown> {
  const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;

  const results = await sql<{ reactions: string; unique_reactors: string }[]>`
    SELECT
      COUNT(*) as reactions,
      COUNT(DISTINCT reactor_id) as unique_reactors
    FROM reactions
    WHERE author_id = ${userId}
    AND author_id != reactor_id
    AND reactor_role = 'Sensei'
    AND timestamp >= ${cutoffTimestamp}
  `;

  const row = results[0];
  return {
    reactions: parseInt(row?.reactions || '0', 10),
    uniqueReactors: parseInt(row?.unique_reactors || '0', 10),
  };
}

/**
 * Get all users with reactions (for leaderboard)
 */
export interface LeaderboardEntry {
  user_id: string;
  reaction_count: number;
}

export async function getLeaderboard(role?: Role, limit: number = 20): Promise<LeaderboardEntry[]> {
  const results = await sql<{ user_id: string; reaction_count: string }[]>`
    SELECT author_id as user_id, COUNT(*) as reaction_count
    FROM reactions
    WHERE author_id != reactor_id
    ${role ? sql`AND reactor_role = ${role}` : sql``}
    GROUP BY author_id
    ORDER BY reaction_count DESC
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    user_id: r.user_id,
    reaction_count: parseInt(r.reaction_count, 10),
  }));
}

/**
 * Get top recipients of Sensei reactions within a time window (excludes self-reactions)
 * Returns all users tied for the highest count
 */
export async function getTopSenseiReactionRecipients(days: number): Promise<LeaderboardEntry[]> {
  const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;

  // First, get the max count
  const maxResult = await sql<{ max_count: string }[]>`
    SELECT COALESCE(MAX(cnt), 0) as max_count
    FROM (
      SELECT COUNT(*) as cnt
      FROM reactions
      WHERE reactor_role = 'Sensei'
      AND author_id != reactor_id
      AND timestamp >= ${cutoffTimestamp}
      GROUP BY author_id
    ) counts
  `;

  const maxCount = parseInt(maxResult[0]?.max_count || '0', 10);

  if (maxCount === 0) {
    return [];
  }

  // Then get all users with that max count
  const results = await sql<{ user_id: string; reaction_count: string }[]>`
    SELECT author_id as user_id, COUNT(*) as reaction_count
    FROM reactions
    WHERE reactor_role = 'Sensei'
    AND author_id != reactor_id
    AND timestamp >= ${cutoffTimestamp}
    GROUP BY author_id
    HAVING COUNT(*) = ${maxCount}
  `;

  return results.map((r) => ({
    user_id: r.user_id,
    reaction_count: parseInt(r.reaction_count, 10),
  }));
}

// ============================================
// Game Jam Judging Functions
// ============================================

export interface Comparison {
  id: string;
  jam_slug: string;
  judge_id: string;
  entry_a_id: string;
  entry_b_id: string;
  score: number | null;
  timestamp: number;
}

/**
 * Insert a new comparison
 * Entry IDs are canonicalized (smaller ID first)
 */
export async function insertComparison(
  jamSlug: string,
  judgeId: string,
  entryAId: string,
  entryBId: string,
  score: number | null
): Promise<void> {
  const id = randomUUID();
  const timestamp = Date.now();

  // Canonicalize: entry_a_id should be alphanumerically smaller, flip score if swapped
  const [canonA, canonB, canonScore] =
    entryAId < entryBId
      ? [entryAId, entryBId, score]
      : [entryBId, entryAId, score !== null ? 1.0 - score : null];

  await sql`
    INSERT INTO jam_comparisons (id, jam_slug, judge_id, entry_a_id, entry_b_id, score, timestamp)
    VALUES (${id}, ${jamSlug}, ${judgeId}, ${canonA}, ${canonB}, ${canonScore}, ${timestamp})
  `;
}

/**
 * Get all comparisons for a jam
 */
export async function getComparisonsForJam(jamSlug: string): Promise<Comparison[]> {
  const results = await sql<Comparison[]>`
    SELECT id, jam_slug, judge_id, entry_a_id, entry_b_id, score, timestamp
    FROM jam_comparisons
    WHERE jam_slug = ${jamSlug}
    ORDER BY timestamp DESC
  `;

  return results;
}

/**
 * Get comparisons for a jam within a date range
 */
export async function getComparisonsForJamInRange(
  jamSlug: string,
  fromTimestamp?: number,
  toTimestamp?: number
): Promise<Comparison[]> {
  const from = fromTimestamp || 0;
  const to = toTimestamp || Date.now();

  const results = await sql<Comparison[]>`
    SELECT id, jam_slug, judge_id, entry_a_id, entry_b_id, score, timestamp
    FROM jam_comparisons
    WHERE jam_slug = ${jamSlug}
    AND timestamp >= ${from}
    AND timestamp <= ${to}
    ORDER BY timestamp DESC
  `;

  return results;
}

/**
 * Get count of comparisons for a judge in a jam
 */
export async function getComparisonCountForJudge(
  jamSlug: string,
  judgeId: string
): Promise<number> {
  const results = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count
    FROM jam_comparisons
    WHERE jam_slug = ${jamSlug}
    AND judge_id = ${judgeId}
  `;

  return parseInt(results[0]?.count || '0', 10);
}

/**
 * Get unique judge count for a jam
 */
export async function getUniqueJudgeCount(jamSlug: string): Promise<number> {
  const results = await sql<{ count: string }[]>`
    SELECT COUNT(DISTINCT judge_id) as count
    FROM jam_comparisons
    WHERE jam_slug = ${jamSlug}
  `;

  return parseInt(results[0]?.count || '0', 10);
}
