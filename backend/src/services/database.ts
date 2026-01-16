import postgres, { Sql } from 'postgres';
import { config } from '../utils/config.js';
import {
  Reaction,
  RoleHistory,
  Role,
  Story,
  ThreadDraft,
  PipelineRun,
  StoredStory,
  StoredDraft,
} from '../types.js';
import { randomUUID } from 'crypto';

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
    const id = randomUUID();
    const timestamp = Date.now();

    await sql`
      INSERT INTO reactions (id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp)
      VALUES (${id}, ${messageId}, ${messageAuthorId}, ${reactorId}, ${reactorRole}, ${timestamp})
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
    SELECT id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp
    FROM reactions
    WHERE message_author_id = ${userId}
    ORDER BY timestamp DESC
  `;

  return results;
}

/**
 * Get reactions for a user filtered by reactor role(s)
 */
export async function getReactionsByRole(userId: string, roles: Role[]): Promise<Reaction[]> {
  const results = await sql<Reaction[]>`
    SELECT id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp
    FROM reactions
    WHERE message_author_id = ${userId}
    AND reactor_role_at_time = ANY(${roles})
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
    SELECT id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp
    FROM reactions
    WHERE message_author_id = ${userId}
    AND reactor_role_at_time = 'Sensei'
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
    WHERE message_author_id = ${userId}
    AND reactor_role_at_time = ANY(${roles})
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
    WHERE message_author_id = ${userId}
    AND reactor_role_at_time = ANY(${roles})
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
      SUM(CASE WHEN reactor_role_at_time = 'Kohai' THEN 1 ELSE 0 END) as fromKohai,
      SUM(CASE WHEN reactor_role_at_time = 'Senpai' THEN 1 ELSE 0 END) as fromSenpai,
      SUM(CASE WHEN reactor_role_at_time = 'Sensei' THEN 1 ELSE 0 END) as fromSensei
    FROM reactions
    WHERE message_author_id = ${userId}
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
 * Insert a role change into history
 */
export async function insertRoleHistory(
  userId: string,
  role: Role,
  reason: 'promotion' | 'demotion' | 'decay' | 'manual'
): Promise<void> {
  const id = randomUUID();
  const timestamp = Date.now();

  await sql`
    INSERT INTO role_history (id, user_id, role, reason, timestamp)
    VALUES (${id}, ${userId}, ${role}, ${reason}, ${timestamp})
  `;

  console.debug(`Role history recorded: ${userId} -> ${role} (${reason})`);
}

/**
 * Get role history for a user
 */
export async function getRoleHistory(userId: string): Promise<RoleHistory[]> {
  const results = await sql<RoleHistory[]>`
    SELECT id, user_id, role, reason, timestamp
    FROM role_history
    WHERE user_id = ${userId}
    ORDER BY timestamp DESC
  `;

  return results;
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
    SELECT message_author_id as user_id, COUNT(*) as reaction_count
    FROM reactions
    ${role ? sql`WHERE reactor_role_at_time = ${role}` : sql``}
    GROUP BY message_author_id
    ORDER BY reaction_count DESC
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    user_id: r.user_id,
    reaction_count: parseInt(r.reaction_count, 10),
  }));
}

// ============================================
// Content Pipeline Functions
// ============================================

/**
 * Insert a story into the database
 */
export async function insertStory(story: Story): Promise<void> {
  const messageIds = JSON.stringify(story.sourceMessages.map((m) => m.id));
  const channelId = story.sourceMessages[0]?.channelId || '';
  const createdAt = Date.now();

  await sql`
    INSERT INTO content_stories (id, title, summary, source_message_ids, source_channel_id, confidence, created_at)
    VALUES (${story.id}, ${story.title}, ${story.summary}, ${messageIds}, ${channelId}, ${story.confidence}, ${createdAt})
  `;
}

/**
 * Insert a draft into the database
 */
export async function insertDraft(
  storyId: string,
  draft: ThreadDraft,
  status: 'pending' | 'submitted' | 'failed' = 'pending',
  typefullyDraftId?: string
): Promise<string> {
  const id = randomUUID();
  const createdAt = Date.now();

  await sql`
    INSERT INTO content_drafts (id, story_id, tweets, image_prompt, image_url, typefully_draft_id, status, created_at)
    VALUES (
      ${id},
      ${storyId},
      ${JSON.stringify(draft.content.tweets)},
      ${draft.image?.prompt || ''},
      ${draft.image?.url || null},
      ${typefullyDraftId || null},
      ${status},
      ${createdAt}
    )
  `;

  return id;
}

/**
 * Update draft status after publishing
 */
export async function updateDraftStatus(
  draftId: string,
  status: 'pending' | 'submitted' | 'failed',
  typefullyDraftId?: string
): Promise<void> {
  await sql`
    UPDATE content_drafts
    SET status = ${status}, typefully_draft_id = COALESCE(${typefullyDraftId || null}, typefully_draft_id)
    WHERE id = ${draftId}
  `;
}

/**
 * Get drafts by status
 */
export async function getDraftsByStatus(
  status: 'pending' | 'submitted' | 'failed'
): Promise<StoredDraft[]> {
  const results = await sql<StoredDraft[]>`
    SELECT id, story_id, tweets, image_prompt, image_url, typefully_draft_id, status, created_at
    FROM content_drafts
    WHERE status = ${status}
    ORDER BY created_at DESC
  `;

  return results;
}

/**
 * Get recent stories
 */
export async function getRecentStories(limit: number = 20): Promise<StoredStory[]> {
  const results = await sql<StoredStory[]>`
    SELECT id, title, summary, source_message_ids, source_channel_id, confidence, created_at
    FROM content_stories
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Start a new pipeline run
 */
export async function startPipelineRun(): Promise<string> {
  const id = randomUUID();
  const startedAt = Date.now();

  await sql`
    INSERT INTO content_pipeline_runs (id, started_at)
    VALUES (${id}, ${startedAt})
  `;

  return id;
}

/**
 * Update pipeline run with results
 */
export async function completePipelineRun(
  runId: string,
  results: {
    messagesScanned: number;
    storiesIdentified: number;
    draftsCreated: number;
    draftsFailed: number;
    error?: string;
  }
): Promise<void> {
  const completedAt = Date.now();

  await sql`
    UPDATE content_pipeline_runs
    SET completed_at = ${completedAt},
        messages_scanned = ${results.messagesScanned},
        stories_identified = ${results.storiesIdentified},
        drafts_created = ${results.draftsCreated},
        drafts_failed = ${results.draftsFailed},
        error = ${results.error || null}
    WHERE id = ${runId}
  `;
}

/**
 * Get recent pipeline runs
 */
export async function getRecentPipelineRuns(limit: number = 10): Promise<PipelineRun[]> {
  const results = await sql<
    {
      id: string;
      started_at: string;
      completed_at: string | null;
      messages_scanned: number;
      stories_identified: number;
      drafts_created: number;
      drafts_failed: number;
      error: string | null;
    }[]
  >`
    SELECT
      id,
      started_at,
      completed_at,
      messages_scanned,
      stories_identified,
      drafts_created,
      drafts_failed,
      error
    FROM content_pipeline_runs
    ORDER BY started_at DESC
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    id: r.id,
    startedAt: parseInt(r.started_at, 10),
    completedAt: r.completed_at ? parseInt(r.completed_at, 10) : undefined,
    messagesScanned: r.messages_scanned,
    storiesIdentified: r.stories_identified,
    draftsCreated: r.drafts_created,
    draftsFailed: r.drafts_failed,
    error: r.error || undefined,
  }));
}

/**
 * Check if a story with similar source messages already exists (deduplication)
 */
export async function storyExists(messageIds: string[]): Promise<boolean> {
  if (messageIds.length === 0) {
    return false;
  }

  const patterns = messageIds.map((id) => `%${id}%`);
  const results = await sql`
    SELECT 1 FROM content_stories
    WHERE source_message_ids LIKE ANY(${patterns})
    LIMIT 1
  `;

  return results.length > 0;
}
