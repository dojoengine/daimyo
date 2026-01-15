import Database from 'better-sqlite3';
import { config } from '../utils/config.js';
import { Reaction, RoleHistory, Role } from '../types.js';
import { randomUUID } from 'crypto';
import { createContentPipelineTables } from './contentDatabase.js';

let db: Database.Database;

/**
 * Initialize database connection and create tables
 */
export function initializeDatabase(): void {
  console.log(`Initializing database at ${config.databasePath}`);

  db = new Database(config.databasePath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  createTables();

  console.log('Database initialized successfully');
}

/**
 * Create database tables if they don't exist
 */
function createTables(): void {
  // Reactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      message_author_id TEXT NOT NULL,
      reactor_id TEXT NOT NULL,
      reactor_role_at_time TEXT NOT NULL CHECK(reactor_role_at_time IN ('Kohai', 'Senpai', 'Sensei')),
      timestamp INTEGER NOT NULL,
      UNIQUE(message_id, reactor_id)
    )
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reactions_author ON reactions(message_author_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_reactor ON reactions(reactor_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_timestamp ON reactions(timestamp);
  `);

  // Role history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS role_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Kohai', 'Senpai', 'Sensei')),
      reason TEXT NOT NULL CHECK(reason IN ('promotion', 'demotion', 'decay', 'manual')),
      timestamp INTEGER NOT NULL
    )
  `);

  // Create index for role history queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_role_history_user ON role_history(user_id);
  `);

  console.log('Database tables created/verified');

  // Create content pipeline tables
  createContentPipelineTables();
}

/**
 * Insert a new reaction into the database
 * Returns true if inserted, false if duplicate (caught by UNIQUE constraint)
 */
export function insertReaction(
  messageId: string,
  messageAuthorId: string,
  reactorId: string,
  reactorRole: Role
): boolean {
  const stmt = db.prepare(`
    INSERT INTO reactions (id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  try {
    const id = randomUUID();
    const timestamp = Date.now();
    stmt.run(id, messageId, messageAuthorId, reactorId, reactorRole, timestamp);
    console.debug(
      `Inserted reaction: ${reactorId} (${reactorRole}) -> ${messageAuthorId} on message ${messageId}`
    );
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      console.debug(`Duplicate reaction ignored: ${reactorId} -> ${messageId}`);
      return false;
    }
    throw error;
  }
}

/**
 * Get all reactions received by a user
 */
export function getReactionsForUser(userId: string): Reaction[] {
  const stmt = db.prepare(`
    SELECT * FROM reactions
    WHERE message_author_id = ?
    ORDER BY timestamp DESC
  `);

  return stmt.all(userId) as Reaction[];
}

/**
 * Get reactions for a user filtered by reactor role(s)
 */
export function getReactionsByRole(userId: string, roles: Role[]): Reaction[] {
  const placeholders = roles.map(() => '?').join(',');
  const stmt = db.prepare(`
    SELECT * FROM reactions
    WHERE message_author_id = ?
    AND reactor_role_at_time IN (${placeholders})
    ORDER BY timestamp DESC
  `);

  return stmt.all(userId, ...roles) as Reaction[];
}

/**
 * Get recent Sensei reactions for a user (within time window)
 */
export function getRecentSenseiReactions(userId: string, days: number): Reaction[] {
  const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;
  const stmt = db.prepare(`
    SELECT * FROM reactions
    WHERE message_author_id = ?
    AND reactor_role_at_time = 'Sensei'
    AND timestamp >= ?
    ORDER BY timestamp DESC
  `);

  return stmt.all(userId, cutoffTimestamp) as Reaction[];
}

/**
 * Get unique reactors for a user from specific roles
 */
export function getUniqueReactors(userId: string, roles: Role[]): string[] {
  const placeholders = roles.map(() => '?').join(',');
  const stmt = db.prepare(`
    SELECT DISTINCT reactor_id
    FROM reactions
    WHERE message_author_id = ?
    AND reactor_role_at_time IN (${placeholders})
  `);

  const results = stmt.all(userId, ...roles) as Array<{ reactor_id: string }>;
  return results.map((r) => r.reactor_id);
}

/**
 * Get count of reactions for a user from specific roles
 */
export function getReactionCount(userId: string, roles: Role[]): number {
  const placeholders = roles.map(() => '?').join(',');
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM reactions
    WHERE message_author_id = ?
    AND reactor_role_at_time IN (${placeholders})
  `);

  const result = stmt.get(userId, ...roles) as { count: number };
  return result.count;
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

export function getReactionBreakdown(userId: string): ReactionCountsByRole {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN reactor_role_at_time = 'Kohai' THEN 1 ELSE 0 END) as fromKohai,
      SUM(CASE WHEN reactor_role_at_time = 'Senpai' THEN 1 ELSE 0 END) as fromSenpai,
      SUM(CASE WHEN reactor_role_at_time = 'Sensei' THEN 1 ELSE 0 END) as fromSensei
    FROM reactions
    WHERE message_author_id = ?
  `);

  const result = stmt.get(userId) as ReactionCountsByRole | undefined;
  return result || { total: 0, fromKohai: 0, fromSenpai: 0, fromSensei: 0 };
}

/**
 * Insert a role change into history
 */
export function insertRoleHistory(
  userId: string,
  role: Role,
  reason: 'promotion' | 'demotion' | 'decay' | 'manual'
): void {
  const stmt = db.prepare(`
    INSERT INTO role_history (id, user_id, role, reason, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);

  const id = randomUUID();
  const timestamp = Date.now();
  stmt.run(id, userId, role, reason, timestamp);
  console.debug(`Role history recorded: ${userId} -> ${role} (${reason})`);
}

/**
 * Get role history for a user
 */
export function getRoleHistory(userId: string): RoleHistory[] {
  const stmt = db.prepare(`
    SELECT * FROM role_history
    WHERE user_id = ?
    ORDER BY timestamp DESC
  `);

  return stmt.all(userId) as RoleHistory[];
}

/**
 * Get all users with reactions (for leaderboard)
 */
export interface LeaderboardEntry {
  user_id: string;
  reaction_count: number;
}

export function getLeaderboard(role?: Role, limit: number = 20): LeaderboardEntry[] {
  let query = `
    SELECT message_author_id as user_id, COUNT(*) as reaction_count
    FROM reactions
  `;

  if (role) {
    query += ` WHERE reactor_role_at_time = ?`;
  }

  query += `
    GROUP BY message_author_id
    ORDER BY reaction_count DESC
    LIMIT ?
  `;

  const stmt = db.prepare(query);
  const params = role ? [role, limit] : [limit];
  return stmt.all(...params) as LeaderboardEntry[];
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    console.log('Database connection closed');
  }
}

/**
 * Get database instance (for advanced queries if needed)
 */
export function getDatabase(): Database.Database {
  return db;
}
