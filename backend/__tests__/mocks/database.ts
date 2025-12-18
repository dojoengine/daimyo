/**
 * Test database utilities
 * Creates in-memory SQLite databases for testing
 */

import Database from 'better-sqlite3';
import { Role } from '../../src/types.js';

/**
 * Create an in-memory test database with schema
 */
export function createTestDatabase(): Database.Database {
  const db = new Database(':memory:');

  // Enable WAL mode
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      message_author_id TEXT NOT NULL,
      reactor_id TEXT NOT NULL,
      reactor_role_at_time TEXT NOT NULL CHECK(reactor_role_at_time IN ('Kohai', 'Senpai', 'Sensei')),
      timestamp INTEGER NOT NULL,
      UNIQUE(message_id, reactor_id)
    )
  `);

  db.exec(`
    CREATE INDEX idx_reactions_author ON reactions(message_author_id);
    CREATE INDEX idx_reactions_reactor ON reactions(reactor_id);
    CREATE INDEX idx_reactions_timestamp ON reactions(timestamp);
  `);

  db.exec(`
    CREATE TABLE role_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Kohai', 'Senpai', 'Sensei')),
      reason TEXT NOT NULL CHECK(reason IN ('promotion', 'demotion', 'decay', 'manual')),
      timestamp INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE INDEX idx_role_history_user ON role_history(user_id);
  `);

  return db;
}

/**
 * Insert test reactions into database
 */
export function insertTestReaction(
  db: Database.Database,
  messageId: string,
  messageAuthorId: string,
  reactorId: string,
  reactorRole: Role,
  timestamp: number = Date.now()
): void {
  const stmt = db.prepare(`
    INSERT INTO reactions (id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const id = `test-reaction-${messageId}-${reactorId}`;
  stmt.run(id, messageId, messageAuthorId, reactorId, reactorRole, timestamp);
}

/**
 * Insert test role history into database
 */
export function insertTestRoleHistory(
  db: Database.Database,
  userId: string,
  role: Role,
  reason: 'promotion' | 'demotion' | 'decay' | 'manual',
  timestamp: number = Date.now()
): void {
  const stmt = db.prepare(`
    INSERT INTO role_history (id, user_id, role, reason, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);

  const id = `test-history-${userId}-${timestamp}`;
  stmt.run(id, userId, role, reason, timestamp);
}

/**
 * Get reaction count for a user from specific roles
 */
export function getTestReactionCount(db: Database.Database, userId: string, roles: Role[]): number {
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
 * Clear all data from test database
 */
export function clearTestDatabase(db: Database.Database): void {
  db.exec('DELETE FROM reactions');
  db.exec('DELETE FROM role_history');
}
