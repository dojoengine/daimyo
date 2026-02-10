/**
 * Game jam judging schema migration
 * Creates table for pairwise comparisons
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  // Pairwise comparisons table
  pgm.createTable('jam_comparisons', {
    id: { type: 'text', primaryKey: true },
    jam_slug: { type: 'text', notNull: true },
    judge_id: { type: 'text', notNull: true },
    entry_a_id: { type: 'text', notNull: true },
    entry_b_id: { type: 'text', notNull: true },
    score: { type: 'real' }, // NULL if skipped, 0.0-1.0 for preference
    timestamp: { type: 'bigint', notNull: true },
  });

  // Unique constraint: one comparison per judge per pair per jam
  pgm.addConstraint('jam_comparisons', 'jam_comparisons_unique_judge_pair', {
    unique: ['jam_slug', 'judge_id', 'entry_a_id', 'entry_b_id'],
  });

  // Indexes for common queries
  pgm.createIndex('jam_comparisons', 'jam_slug', { name: 'idx_jam_comparisons_jam' });
  pgm.createIndex('jam_comparisons', 'judge_id', { name: 'idx_jam_comparisons_judge' });
  pgm.createIndex('jam_comparisons', 'timestamp', { name: 'idx_jam_comparisons_timestamp' });
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable('jam_comparisons');
};
