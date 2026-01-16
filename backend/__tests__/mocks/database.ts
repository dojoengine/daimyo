/**
 * Test database utilities
 * Creates in-memory PGlite databases for testing
 */

import { PGlite } from '@electric-sql/pglite';
import { Role } from '../../src/types.js';

/**
 * Create an in-memory test database with schema
 */
export async function createTestDatabase(): Promise<PGlite> {
  const db = new PGlite();

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      message_author_id TEXT NOT NULL,
      reactor_id TEXT NOT NULL,
      reactor_role_at_time TEXT NOT NULL CHECK(reactor_role_at_time IN ('Kohai', 'Senpai', 'Sensei')),
      timestamp BIGINT NOT NULL,
      UNIQUE(message_id, reactor_id)
    )
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reactions_author ON reactions(message_author_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_reactor ON reactions(reactor_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_timestamp ON reactions(timestamp);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS role_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Kohai', 'Senpai', 'Sensei')),
      reason TEXT NOT NULL CHECK(reason IN ('promotion', 'demotion', 'decay', 'manual')),
      timestamp BIGINT NOT NULL
    )
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_role_history_user ON role_history(user_id);
  `);

  // Content pipeline tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS content_stories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      source_message_ids TEXT NOT NULL,
      source_channel_id TEXT NOT NULL,
      confidence REAL NOT NULL,
      created_at BIGINT NOT NULL
    )
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_content_stories_created ON content_stories(created_at);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS content_drafts (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL REFERENCES content_stories(id) ON DELETE CASCADE,
      tweets TEXT NOT NULL,
      image_prompt TEXT NOT NULL,
      image_url TEXT,
      typefully_draft_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('pending', 'submitted', 'failed')),
      created_at BIGINT NOT NULL
    )
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_content_drafts_story ON content_drafts(story_id);
    CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON content_drafts(status);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS content_pipeline_runs (
      id TEXT PRIMARY KEY,
      started_at BIGINT NOT NULL,
      completed_at BIGINT,
      messages_scanned INTEGER NOT NULL DEFAULT 0,
      stories_identified INTEGER NOT NULL DEFAULT 0,
      drafts_created INTEGER NOT NULL DEFAULT 0,
      drafts_failed INTEGER NOT NULL DEFAULT 0,
      error TEXT
    )
  `);

  return db;
}

/**
 * Insert test reactions into database
 */
export async function insertTestReaction(
  db: PGlite,
  messageId: string,
  messageAuthorId: string,
  reactorId: string,
  reactorRole: Role,
  timestamp: number = Date.now()
): Promise<void> {
  const id = `test-reaction-${messageId}-${reactorId}`;

  await db.query(
    `INSERT INTO reactions (id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, messageId, messageAuthorId, reactorId, reactorRole, timestamp]
  );
}

/**
 * Insert test role history into database
 */
export async function insertTestRoleHistory(
  db: PGlite,
  userId: string,
  role: Role,
  reason: 'promotion' | 'demotion' | 'decay' | 'manual',
  timestamp: number = Date.now()
): Promise<void> {
  const id = `test-history-${userId}-${timestamp}`;

  await db.query(
    `INSERT INTO role_history (id, user_id, role, reason, timestamp)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, role, reason, timestamp]
  );
}

/**
 * Get reaction count for a user from specific roles
 */
export async function getTestReactionCount(
  db: PGlite,
  userId: string,
  roles: Role[]
): Promise<number> {
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM reactions
     WHERE message_author_id = $1
     AND reactor_role_at_time = ANY($2)`,
    [userId, roles]
  );

  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Clear all data from test database
 */
export async function clearTestDatabase(db: PGlite): Promise<void> {
  await db.exec('DELETE FROM content_drafts');
  await db.exec('DELETE FROM content_stories');
  await db.exec('DELETE FROM content_pipeline_runs');
  await db.exec('DELETE FROM reactions');
  await db.exec('DELETE FROM role_history');
}

/**
 * Close test database
 */
export async function closeTestDatabase(db: PGlite): Promise<void> {
  await db.close();
}
