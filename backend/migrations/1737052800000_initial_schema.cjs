/**
 * Initial database schema migration
 * Creates all tables for reputation system and content pipeline
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  // ============================================
  // Reputation System Tables
  // ============================================

  // Reactions table
  pgm.createTable('reactions', {
    id: { type: 'serial', primaryKey: true },
    message_id: { type: 'text', notNull: true },
    author_id: { type: 'text', notNull: true },
    reactor_id: { type: 'text', notNull: true },
    reactor_role: {
      type: 'text',
      notNull: true,
      check: "reactor_role IN ('Kohai', 'Senpai', 'Sensei')",
    },
    timestamp: { type: 'bigint', notNull: true },
  });

  pgm.addConstraint('reactions', 'reactions_unique_message_reactor', {
    unique: ['message_id', 'reactor_id'],
  });

  pgm.createIndex('reactions', 'author_id', { name: 'idx_reactions_author' });
  pgm.createIndex('reactions', 'reactor_id', { name: 'idx_reactions_reactor' });
  pgm.createIndex('reactions', 'timestamp', { name: 'idx_reactions_timestamp' });

  // ============================================
  // Content Pipeline Tables
  // ============================================

  // Stories table
  pgm.createTable('content_stories', {
    id: { type: 'serial', primaryKey: true },
    title: { type: 'text', notNull: true },
    summary: { type: 'text', notNull: true },
    source_message_ids: { type: 'text', notNull: true },
    source_channel_id: { type: 'text', notNull: true },
    confidence: { type: 'real', notNull: true },
    created_at: { type: 'bigint', notNull: true },
  });

  pgm.createIndex('content_stories', 'created_at', { name: 'idx_content_stories_created' });

  // Drafts table
  pgm.createTable('content_drafts', {
    id: { type: 'serial', primaryKey: true },
    story_id: {
      type: 'integer',
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

  // Pipeline runs table
  pgm.createTable('content_pipeline_runs', {
    id: { type: 'serial', primaryKey: true },
    started_at: { type: 'bigint', notNull: true },
    completed_at: { type: 'bigint' },
    messages_scanned: { type: 'integer', notNull: true, default: 0 },
    stories_identified: { type: 'integer', notNull: true, default: 0 },
    drafts_created: { type: 'integer', notNull: true, default: 0 },
    drafts_failed: { type: 'integer', notNull: true, default: 0 },
    error: { type: 'text' },
  });
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable('content_pipeline_runs');
  pgm.dropTable('content_drafts');
  pgm.dropTable('content_stories');
  pgm.dropTable('reactions');
};
