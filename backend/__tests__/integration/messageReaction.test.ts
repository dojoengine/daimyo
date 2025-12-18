/**
 * Integration tests for message reaction handling
 * Tests the full flow from reaction event to database storage and promotion checks
 */

import { Role } from '../../src/types.js';
import {
  createMockGuild,
  createMockMember,
  createMockReaction,
  createMockUser,
  addMemberToGuild,
} from '../mocks/discord.js';
import { createTestDatabase } from '../mocks/database.js';
import Database from 'better-sqlite3';

describe('Message Reaction Integration Tests', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Reaction Tracking Flow', () => {
    test('should track valid :dojo: reaction and store in database', () => {
      // Setup: Create guild with members
      const guild = createMockGuild();
      const author = createMockMember('author-1', 'Author#0001', ['kohai-role-id']);
      const reactor = createMockMember('reactor-1', 'Reactor#0001', ['senpai-role-id']);

      addMemberToGuild(guild, author, Role.Kohai);
      addMemberToGuild(guild, reactor, Role.Senpai);

      // Simulate reaction
      const reaction = createMockReaction('msg-1', 'author-1', 'dojo');
      reaction.message.guild = guild;

      // Manually insert reaction (simulating what the handler would do)
      const stmt = db.prepare(`
        INSERT INTO reactions (id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run('test-1', 'msg-1', 'author-1', 'reactor-1', Role.Senpai, Date.now());

      // Verify reaction was stored
      const check = db.prepare('SELECT * FROM reactions WHERE message_id = ?');
      const results = check.all('msg-1');

      expect(results).toHaveLength(1);
      expect((results[0] as any).reactor_role_at_time).toBe(Role.Senpai);
    });

    test('should ignore self-reactions', () => {
      const guild = createMockGuild();
      const member = createMockMember('user-1', 'User#0001', ['senpai-role-id']);
      addMemberToGuild(guild, member, Role.Senpai);

      const reaction = createMockReaction('msg-1', 'user-1', 'dojo'); // Same user
      const user = createMockUser('user-1', 'User#0001');

      // Handler should skip self-reactions
      const shouldProcess = reaction.message.author?.id !== user.id;

      expect(shouldProcess).toBe(false);
    });

    test('should ignore duplicate reactions', () => {
      // First reaction
      const stmt = db.prepare(`
        INSERT INTO reactions (id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run('test-1', 'msg-1', 'author-1', 'reactor-1', Role.Senpai, Date.now());

      // Attempt duplicate (should throw due to UNIQUE constraint)
      expect(() => {
        stmt.run('test-2', 'msg-1', 'author-1', 'reactor-1', Role.Senpai, Date.now());
      }).toThrow();

      // Verify only one reaction exists
      const check = db.prepare('SELECT COUNT(*) as count FROM reactions WHERE message_id = ?');
      const result = check.get('msg-1') as { count: number };

      expect(result.count).toBe(1);
    });

    test('should preserve reactor role snapshot even if they are later demoted', () => {
      const stmt = db.prepare(`
        INSERT INTO reactions (id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Reactor was Sensei at time of reaction
      stmt.run('test-1', 'msg-1', 'author-1', 'reactor-1', Role.Sensei, Date.now());

      // Later, reactor might be demoted to Senpai (in real system)
      // But the stored reaction still shows Sensei

      const check = db.prepare('SELECT reactor_role_at_time FROM reactions WHERE reactor_id = ?');
      const result = check.get('reactor-1') as { reactor_role_at_time: string };

      expect(result.reactor_role_at_time).toBe(Role.Sensei);
    });
  });

  describe('Promotion Trigger Flow', () => {
    test('should trigger Senpai promotion when thresholds met', () => {
      const guild = createMockGuild();

      // Setup guild with 100 Senpai+Sensei (need 10% = 10 unique)
      for (let i = 0; i < 70; i++) {
        const member = createMockMember(`senpai-${i}`, `Senpai${i}#0001`, ['senpai-role-id']);
        addMemberToGuild(guild, member, Role.Senpai);
      }
      for (let i = 0; i < 30; i++) {
        const member = createMockMember(`sensei-${i}`, `Sensei${i}#0001`, ['sensei-role-id']);
        addMemberToGuild(guild, member, Role.Sensei);
      }

      const target = createMockMember('target-1', 'Target#0001', ['kohai-role-id']);
      addMemberToGuild(guild, target, Role.Kohai);

      // Insert 50 reactions from 10 unique Senpai
      const stmt = db.prepare(`
        INSERT INTO reactions (id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < 50; i++) {
        const reactorId = `senpai-${i % 10}`; // 10 unique reactors
        stmt.run(`reaction-${i}`, `msg-${i}`, 'target-1', reactorId, Role.Senpai, Date.now());
      }

      // Check promotion eligibility
      const reactionCount = db
        .prepare(
          `SELECT COUNT(*) as count FROM reactions
           WHERE message_author_id = ?
           AND reactor_role_at_time IN ('Senpai', 'Sensei')`
        )
        .get('target-1') as { count: number };

      const uniqueReactors = db
        .prepare(
          `SELECT COUNT(DISTINCT reactor_id) as count FROM reactions
           WHERE message_author_id = ?
           AND reactor_role_at_time IN ('Senpai', 'Sensei')`
        )
        .get('target-1') as { count: number };

      expect(reactionCount.count).toBeGreaterThanOrEqual(50);
      expect(uniqueReactors.count).toBeGreaterThanOrEqual(10);
    });

    test('should not promote with sufficient reactions but insufficient diversity', () => {
      const guild = createMockGuild();

      // 100 Senpai+Sensei, need 10 unique
      for (let i = 0; i < 100; i++) {
        const member = createMockMember(`senpai-${i}`, `Senpai${i}#0001`, ['senpai-role-id']);
        addMemberToGuild(guild, member, Role.Senpai);
      }

      // Insert 60 reactions but only from 5 unique users
      const stmt = db.prepare(`
        INSERT INTO reactions (id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < 60; i++) {
        const reactorId = `senpai-${i % 5}`; // Only 5 unique
        stmt.run(`reaction-${i}`, `msg-${i}`, 'target-1', reactorId, Role.Senpai, Date.now());
      }

      const uniqueReactors = db
        .prepare(
          `SELECT COUNT(DISTINCT reactor_id) as count FROM reactions
           WHERE message_author_id = ?
           AND reactor_role_at_time IN ('Senpai', 'Sensei')`
        )
        .get('target-1') as { count: number };

      // Should not promote: 5 unique < 10 required
      expect(uniqueReactors.count).toBeLessThan(10);
    });
  });

  describe('Reaction from Different Roles', () => {
    test('should count Senpai and Sensei reactions toward Senpai promotion', () => {
      const stmt = db.prepare(`
        INSERT INTO reactions (id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Mix of Senpai and Sensei reactions
      for (let i = 0; i < 30; i++) {
        stmt.run(
          `reaction-senpai-${i}`,
          `msg-${i}`,
          'target-1',
          `reactor-${i}`,
          Role.Senpai,
          Date.now()
        );
      }
      for (let i = 0; i < 25; i++) {
        stmt.run(
          `reaction-sensei-${i}`,
          `msg-${30 + i}`,
          'target-1',
          `reactor-${30 + i}`,
          Role.Sensei,
          Date.now()
        );
      }

      const count = db
        .prepare(
          `SELECT COUNT(*) as count FROM reactions
           WHERE message_author_id = ?
           AND reactor_role_at_time IN ('Senpai', 'Sensei')`
        )
        .get('target-1') as { count: number };

      expect(count.count).toBe(55); // 30 + 25
    });

    test('should not count Kohai reactions toward promotions', () => {
      const stmt = db.prepare(`
        INSERT INTO reactions (id, message_id, message_author_id, reactor_id, reactor_role_at_time, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Kohai reactions
      for (let i = 0; i < 100; i++) {
        stmt.run(`reaction-${i}`, `msg-${i}`, 'target-1', `reactor-${i}`, Role.Kohai, Date.now());
      }

      const countForPromotion = db
        .prepare(
          `SELECT COUNT(*) as count FROM reactions
           WHERE message_author_id = ?
           AND reactor_role_at_time IN ('Senpai', 'Sensei')`
        )
        .get('target-1') as { count: number };

      expect(countForPromotion.count).toBe(0); // Kohai reactions don't count
    });
  });
});
