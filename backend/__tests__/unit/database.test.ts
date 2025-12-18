/**
 * Unit tests for database service
 */

import { Role } from '../../src/types.js';
import { createTestDatabase, insertTestReaction, getTestReactionCount } from '../mocks/database.js';
import Database from 'better-sqlite3';

describe('Database Service', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Reaction Storage', () => {
    test('should insert reaction successfully', () => {
      insertTestReaction(db, 'msg-1', 'author-1', 'reactor-1', Role.Senpai);

      const count = getTestReactionCount(db, 'author-1', [Role.Senpai]);
      expect(count).toBe(1);
    });

    test('should enforce UNIQUE constraint on (message_id, reactor_id)', () => {
      insertTestReaction(db, 'msg-1', 'author-1', 'reactor-1', Role.Senpai);

      // Attempting to insert duplicate should throw
      expect(() => {
        insertTestReaction(db, 'msg-1', 'author-1', 'reactor-1', Role.Senpai);
      }).toThrow();
    });

    test('should allow same reactor on different messages', () => {
      insertTestReaction(db, 'msg-1', 'author-1', 'reactor-1', Role.Senpai);
      insertTestReaction(db, 'msg-2', 'author-1', 'reactor-1', Role.Senpai);

      const count = getTestReactionCount(db, 'author-1', [Role.Senpai]);
      expect(count).toBe(2);
    });

    test('should allow different reactors on same message', () => {
      insertTestReaction(db, 'msg-1', 'author-1', 'reactor-1', Role.Senpai);
      insertTestReaction(db, 'msg-1', 'author-1', 'reactor-2', Role.Senpai);

      const count = getTestReactionCount(db, 'author-1', [Role.Senpai]);
      expect(count).toBe(2);
    });

    test('should store reactor role snapshot', () => {
      insertTestReaction(db, 'msg-1', 'author-1', 'reactor-1', Role.Sensei);

      const stmt = db.prepare('SELECT reactor_role_at_time FROM reactions WHERE reactor_id = ?');
      const result = stmt.get('reactor-1') as { reactor_role_at_time: string };

      expect(result.reactor_role_at_time).toBe(Role.Sensei);
    });
  });

  describe('Reaction Queries', () => {
    beforeEach(() => {
      // Set up test data
      insertTestReaction(db, 'msg-1', 'user-1', 'reactor-1', Role.Kohai);
      insertTestReaction(db, 'msg-2', 'user-1', 'reactor-2', Role.Senpai);
      insertTestReaction(db, 'msg-3', 'user-1', 'reactor-3', Role.Senpai);
      insertTestReaction(db, 'msg-4', 'user-1', 'reactor-4', Role.Sensei);
      insertTestReaction(db, 'msg-5', 'user-2', 'reactor-1', Role.Senpai);
    });

    test('should count reactions from Senpai only', () => {
      const count = getTestReactionCount(db, 'user-1', [Role.Senpai]);
      expect(count).toBe(2);
    });

    test('should count reactions from Senpai and Sensei', () => {
      const count = getTestReactionCount(db, 'user-1', [Role.Senpai, Role.Sensei]);
      expect(count).toBe(3);
    });

    test('should count reactions from all roles', () => {
      const count = getTestReactionCount(db, 'user-1', [Role.Kohai, Role.Senpai, Role.Sensei]);
      expect(count).toBe(4);
    });

    test('should return 0 for user with no reactions', () => {
      const count = getTestReactionCount(db, 'user-999', [Role.Senpai]);
      expect(count).toBe(0);
    });

    test('should get unique reactors correctly', () => {
      const stmt = db.prepare(`
        SELECT DISTINCT reactor_id
        FROM reactions
        WHERE message_author_id = ?
        AND reactor_role_at_time IN ('Senpai', 'Sensei')
      `);

      const results = stmt.all('user-1') as Array<{ reactor_id: string }>;
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.reactor_id)).toEqual(
        expect.arrayContaining(['reactor-2', 'reactor-3', 'reactor-4'])
      );
    });
  });

  describe('Time-Windowed Queries', () => {
    test('should filter reactions by timestamp', () => {
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

      // Insert reactions at different times
      insertTestReaction(db, 'msg-1', 'user-1', 'reactor-1', Role.Sensei, now);
      insertTestReaction(db, 'msg-2', 'user-1', 'reactor-2', Role.Sensei, thirtyDaysAgo);
      insertTestReaction(db, 'msg-3', 'user-1', 'reactor-3', Role.Sensei, oneYearAgo);

      const cutoff = now - 360 * 24 * 60 * 60 * 1000;
      const stmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM reactions
        WHERE message_author_id = ?
        AND reactor_role_at_time = 'Sensei'
        AND timestamp >= ?
      `);

      const result = stmt.get('user-1', cutoff) as { count: number };
      expect(result.count).toBe(2); // Only recent two reactions
    });
  });

  describe('Role History', () => {
    test('should record role changes', () => {
      const stmt = db.prepare(`
        INSERT INTO role_history (id, user_id, role, reason, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run('hist-1', 'user-1', Role.Senpai, 'promotion', Date.now());

      const check = db.prepare('SELECT * FROM role_history WHERE user_id = ?');
      const results = check.all('user-1');

      expect(results).toHaveLength(1);
    });

    test('should allow multiple history entries per user', () => {
      const now = Date.now();

      const stmt = db.prepare(`
        INSERT INTO role_history (id, user_id, role, reason, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run('hist-1', 'user-1', Role.Senpai, 'promotion', now);
      stmt.run('hist-2', 'user-1', Role.Sensei, 'promotion', now + 1000);

      const check = db.prepare('SELECT * FROM role_history WHERE user_id = ?');
      const results = check.all('user-1');

      expect(results).toHaveLength(2);
    });
  });

  describe('Leaderboard Queries', () => {
    beforeEach(() => {
      // User 1: 5 reactions
      for (let i = 0; i < 5; i++) {
        insertTestReaction(db, `msg-1-${i}`, 'user-1', `reactor-${i}`, Role.Senpai);
      }

      // User 2: 3 reactions
      for (let i = 0; i < 3; i++) {
        insertTestReaction(db, `msg-2-${i}`, 'user-2', `reactor-${i}`, Role.Senpai);
      }

      // User 3: 7 reactions
      for (let i = 0; i < 7; i++) {
        insertTestReaction(db, `msg-3-${i}`, 'user-3', `reactor-${i}`, Role.Senpai);
      }
    });

    test('should return users sorted by reaction count', () => {
      const stmt = db.prepare(`
        SELECT message_author_id as user_id, COUNT(*) as reaction_count
        FROM reactions
        GROUP BY message_author_id
        ORDER BY reaction_count DESC
      `);

      const results = stmt.all() as Array<{
        user_id: string;
        reaction_count: number;
      }>;

      expect(results).toHaveLength(3);
      expect(results[0].user_id).toBe('user-3');
      expect(results[0].reaction_count).toBe(7);
      expect(results[1].user_id).toBe('user-1');
      expect(results[1].reaction_count).toBe(5);
      expect(results[2].user_id).toBe('user-2');
      expect(results[2].reaction_count).toBe(3);
    });
  });
});
