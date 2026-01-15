import { randomUUID } from 'crypto';
import { getDatabase } from './database.js';
import { Story, ThreadDraft, PipelineRun, StoredStory, StoredDraft } from '../types.js';

/**
 * Initialize content pipeline database tables
 * Called from database.ts during initialization
 */
export function createContentPipelineTables(): void {
  const db = getDatabase();

  // Stories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_stories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      source_message_ids TEXT NOT NULL,
      source_channel_id TEXT NOT NULL,
      confidence REAL NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_content_stories_created ON content_stories(created_at);
  `);

  // Drafts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_drafts (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      tweets TEXT NOT NULL,
      image_prompt TEXT NOT NULL,
      image_url TEXT,
      typefully_draft_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('pending', 'submitted', 'failed')),
      created_at INTEGER NOT NULL,
      FOREIGN KEY(story_id) REFERENCES content_stories(id)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_content_drafts_story ON content_drafts(story_id);
    CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON content_drafts(status);
  `);

  // Pipeline runs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_pipeline_runs (
      id TEXT PRIMARY KEY,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      messages_scanned INTEGER NOT NULL DEFAULT 0,
      stories_identified INTEGER NOT NULL DEFAULT 0,
      drafts_created INTEGER NOT NULL DEFAULT 0,
      drafts_failed INTEGER NOT NULL DEFAULT 0,
      error TEXT
    )
  `);

  console.log('Content pipeline tables created/verified');
}

/**
 * Insert a story into the database
 */
export function insertStory(story: Story): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO content_stories (id, title, summary, source_message_ids, source_channel_id, confidence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const messageIds = JSON.stringify(story.sourceMessages.map((m) => m.id));
  const channelId = story.sourceMessages[0]?.channelId || '';

  stmt.run(
    story.id,
    story.title,
    story.summary,
    messageIds,
    channelId,
    story.confidence,
    Date.now()
  );
}

/**
 * Insert a draft into the database
 */
export function insertDraft(
  storyId: string,
  draft: ThreadDraft,
  status: 'pending' | 'submitted' | 'failed' = 'pending',
  typefullyDraftId?: string
): string {
  const db = getDatabase();
  const id = randomUUID();

  const stmt = db.prepare(`
    INSERT INTO content_drafts (id, story_id, tweets, image_prompt, image_url, typefully_draft_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    storyId,
    JSON.stringify(draft.content.tweets),
    draft.image?.prompt || '',
    draft.image?.url || null,
    typefullyDraftId || null,
    status,
    Date.now()
  );

  return id;
}

/**
 * Update draft status after publishing
 */
export function updateDraftStatus(
  draftId: string,
  status: 'pending' | 'submitted' | 'failed',
  typefullyDraftId?: string
): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE content_drafts
    SET status = ?, typefully_draft_id = COALESCE(?, typefully_draft_id)
    WHERE id = ?
  `);

  stmt.run(status, typefullyDraftId || null, draftId);
}

/**
 * Get drafts by status
 */
export function getDraftsByStatus(status: 'pending' | 'submitted' | 'failed'): StoredDraft[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM content_drafts
    WHERE status = ?
    ORDER BY created_at DESC
  `);

  return stmt.all(status) as StoredDraft[];
}

/**
 * Get recent stories
 */
export function getRecentStories(limit: number = 20): StoredStory[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM content_stories
    ORDER BY created_at DESC
    LIMIT ?
  `);

  return stmt.all(limit) as StoredStory[];
}

/**
 * Start a new pipeline run
 */
export function startPipelineRun(): string {
  const db = getDatabase();
  const id = randomUUID();

  const stmt = db.prepare(`
    INSERT INTO content_pipeline_runs (id, started_at)
    VALUES (?, ?)
  `);

  stmt.run(id, Date.now());
  return id;
}

/**
 * Update pipeline run with results
 */
export function completePipelineRun(
  runId: string,
  results: {
    messagesScanned: number;
    storiesIdentified: number;
    draftsCreated: number;
    draftsFailed: number;
    error?: string;
  }
): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE content_pipeline_runs
    SET completed_at = ?,
        messages_scanned = ?,
        stories_identified = ?,
        drafts_created = ?,
        drafts_failed = ?,
        error = ?
    WHERE id = ?
  `);

  stmt.run(
    Date.now(),
    results.messagesScanned,
    results.storiesIdentified,
    results.draftsCreated,
    results.draftsFailed,
    results.error || null,
    runId
  );
}

/**
 * Get recent pipeline runs
 */
export function getRecentPipelineRuns(limit: number = 10): PipelineRun[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT
      id,
      started_at as startedAt,
      completed_at as completedAt,
      messages_scanned as messagesScanned,
      stories_identified as storiesIdentified,
      drafts_created as draftsCreated,
      drafts_failed as draftsFailed,
      error
    FROM content_pipeline_runs
    ORDER BY started_at DESC
    LIMIT ?
  `);

  return stmt.all(limit) as PipelineRun[];
}

/**
 * Check if a story with similar source messages already exists (deduplication)
 */
export function storyExists(messageIds: string[]): boolean {
  if (messageIds.length === 0) {
    return false;
  }

  const db = getDatabase();

  // Build a single query with OR conditions for all message IDs
  const conditions = messageIds.map(() => 'source_message_ids LIKE ?').join(' OR ');
  const params = messageIds.map((id) => `%${id}%`);

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM content_stories
    WHERE ${conditions}
    LIMIT 1
  `);

  const result = stmt.get(...params) as { count: number };
  return result.count > 0;
}
