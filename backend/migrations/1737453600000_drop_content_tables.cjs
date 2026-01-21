/**
 * Drop content pipeline tables
 * Typefully is now the source of truth for drafts
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.dropTable('content_drafts');
  pgm.dropTable('content_stories');
  pgm.dropTable('content_pipeline_runs');
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  // Recreate tables if needed (from original migration)
  pgm.createTable('content_stories', {
    id: { type: 'text', primaryKey: true },
    title: { type: 'text', notNull: true },
    summary: { type: 'text', notNull: true },
    source_message_ids: { type: 'text', notNull: true },
    source_channel_id: { type: 'text', notNull: true },
    confidence: { type: 'real', notNull: true },
    created_at: { type: 'bigint', notNull: true },
  });

  pgm.createIndex('content_stories', 'created_at', { name: 'idx_content_stories_created' });

  pgm.createTable('content_drafts', {
    id: { type: 'text', primaryKey: true },
    story_id: {
      type: 'text',
      notNull: true,
      references: 'content_stories',
      onDelete: 'CASCADE',
    },
    tweets: { type: 'text', notNull: true },
    image_prompt: { type: 'text', notNull: true },
    image_url: { type: 'text' },
    typefully_draft_id: { type: 'text' },
    status: {
      type: 'text',
      notNull: true,
      check: "status IN ('pending', 'submitted', 'failed')",
    },
    created_at: { type: 'bigint', notNull: true },
  });

  pgm.createIndex('content_drafts', 'story_id', { name: 'idx_content_drafts_story' });
  pgm.createIndex('content_drafts', 'status', { name: 'idx_content_drafts_status' });

  pgm.createTable('content_pipeline_runs', {
    id: { type: 'text', primaryKey: true },
    started_at: { type: 'bigint', notNull: true },
    completed_at: { type: 'bigint' },
    messages_scanned: { type: 'integer', notNull: true, default: 0 },
    stories_identified: { type: 'integer', notNull: true, default: 0 },
    drafts_created: { type: 'integer', notNull: true, default: 0 },
    drafts_failed: { type: 'integer', notNull: true, default: 0 },
    error: { type: 'text' },
  });
};
