import postgres, { Sql } from 'postgres';
import { config } from '../utils/config.js';
import { Reaction, Role } from '../types.js';

let sql: Sql;

/**
 * Initialize database connection
 */
export async function initializeDatabase(): Promise<void> {
  console.log('Initializing PostgreSQL database connection...');

  sql = postgres(config.databaseUrl);

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
 * Returns true if inserted, false if duplicate
 */
export async function insertReaction(
  messageId: string,
  messageAuthorId: string,
  reactorId: string,
  reactorRole: Role
): Promise<boolean> {
  try {
    const timestamp = Date.now();

    await sql`
      INSERT INTO reactions (message_id, author_id, reactor_id, reactor_role, timestamp)
      VALUES (${messageId}, ${messageAuthorId}, ${reactorId}, ${reactorRole}, ${timestamp})
    `;

    console.debug(
      `Inserted reaction: ${reactorId} (${reactorRole}) -> ${messageAuthorId} on message ${messageId}`
    );
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
 * Get all reactions received by a user
 */
export async function getReactionsForUser(userId: string): Promise<Reaction[]> {
  const results = await sql<Reaction[]>`
    SELECT id, message_id, author_id, reactor_id, reactor_role, timestamp
    FROM reactions
    WHERE author_id = ${userId}
    ORDER BY timestamp DESC
  `;

  return results;
}

/**
 * Get reactions for a user filtered by reactor role(s)
 */
export async function getReactionsByRole(userId: string, roles: Role[]): Promise<Reaction[]> {
  const results = await sql<Reaction[]>`
    SELECT id, message_id, author_id, reactor_id, reactor_role, timestamp
    FROM reactions
    WHERE author_id = ${userId}
    AND reactor_role = ANY(${roles})
    ORDER BY timestamp DESC
  `;

  return results;
}

/**
 * Get recent Sensei reactions for a user (within time window)
 */
export async function getRecentSenseiReactions(userId: string, days: number): Promise<Reaction[]> {
  const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;

  const results = await sql<Reaction[]>`
    SELECT id, message_id, author_id, reactor_id, reactor_role, timestamp
    FROM reactions
    WHERE author_id = ${userId}
    AND reactor_role = 'Sensei'
    AND timestamp >= ${cutoffTimestamp}
    ORDER BY timestamp DESC
  `;

  return results;
}

/**
 * Get unique reactors for a user from specific roles
 */
export async function getUniqueReactors(userId: string, roles: Role[]): Promise<string[]> {
  const results = await sql<{ reactor_id: string }[]>`
    SELECT DISTINCT reactor_id
    FROM reactions
    WHERE author_id = ${userId}
    AND reactor_role = ANY(${roles})
  `;

  return results.map((r) => r.reactor_id);
}

/**
 * Get count of reactions for a user from specific roles
 */
export async function getReactionCount(userId: string, roles: Role[]): Promise<number> {
  const results = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count
    FROM reactions
    WHERE author_id = ${userId}
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
    ${role ? sql`WHERE reactor_role = ${role}` : sql``}
    GROUP BY author_id
    ORDER BY reaction_count DESC
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    user_id: r.user_id,
    reaction_count: parseInt(r.reaction_count, 10),
  }));
}
