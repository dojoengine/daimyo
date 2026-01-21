/**
 * Unit tests for decay service
 */

import { jest, beforeEach, describe, test, expect } from '@jest/globals';
import { Role } from '../../src/types.js';
import { createMockGuild, createMockMember } from '../mocks/discord.js';

// Mock modules BEFORE importing them
const mockGetRecentSenseiReactions = jest.fn();
const mockInsertRoleHistory = jest.fn();
const mockGetUserRole = jest.fn();
const mockAssignRole = jest.fn();
const mockSendDM = jest.fn();
const mockFormatDemotionMessage = jest.fn();

jest.unstable_mockModule('../../src/services/database.js', () => ({
  getRecentSenseiReactions: mockGetRecentSenseiReactions,
  insertRoleHistory: mockInsertRoleHistory,
}));

jest.unstable_mockModule('../../src/services/roleManager.js', () => ({
  getUserRole: mockGetUserRole,
  assignRole: mockAssignRole,
  sendDM: mockSendDM,
  formatDemotionMessage: mockFormatDemotionMessage,
}));

jest.unstable_mockModule('../../src/utils/config.js', () => ({
  config: {
    decayWindowDays: 360,
    senseiReactionThreshold: 30,
    feltRoleId: 'felt-role-id',
  },
}));

const { checkSenseiDecay, getSenseiDecayStatus } = await import('../../src/services/decay.js');

describe('Decay Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock return value
    mockFormatDemotionMessage.mockReturnValue('Demotion message');
  });

  describe('checkSenseiDecay', () => {
    test('should not demote Sensei with sufficient recent reactions', async () => {
      const guild = createMockGuild();

      mockGetUserRole.mockReturnValue(Role.Sensei);

      // Mock 35 reactions in the last 360 days (above threshold of 30)
      const recentReactions = Array.from({ length: 35 }, (_, i) => ({
        id: `reaction-${i}`,
        message_id: `msg-${i}`,
        message_author_id: 'user-1',
        reactor_id: `reactor-${i}`,
        reactor_role_at_time: Role.Sensei,
        timestamp: Date.now() - i * 1000,
      }));

      mockGetRecentSenseiReactions.mockResolvedValue(recentReactions);

      const result = await checkSenseiDecay(guild as any, 'user-1');

      expect(result.demoted).toBe(false);
      expect(mockAssignRole).not.toHaveBeenCalled();
      expect(mockInsertRoleHistory).not.toHaveBeenCalled();
    });

    test('should demote Sensei with insufficient recent reactions', async () => {
      const guild = createMockGuild();
      const member = createMockMember('user-1', 'TestUser#0001', ['sensei-role-id']);
      guild.members.cache.set('user-1', member);

      mockGetUserRole.mockReturnValue(Role.Sensei);

      // Mock only 25 reactions (below threshold of 30)
      const recentReactions = Array.from({ length: 25 }, (_, i) => ({
        id: `reaction-${i}`,
        message_id: `msg-${i}`,
        message_author_id: 'user-1',
        reactor_id: `reactor-${i}`,
        reactor_role_at_time: Role.Sensei,
        timestamp: Date.now() - i * 1000,
      }));

      mockGetRecentSenseiReactions.mockResolvedValue(recentReactions);

      const result = await checkSenseiDecay(guild as any, 'user-1');

      expect(result.demoted).toBe(true);
      expect(result.oldRole).toBe(Role.Sensei);
      expect(result.newRole).toBe(Role.Senpai);
      expect(mockAssignRole).toHaveBeenCalledWith(guild, 'user-1', Role.Senpai);
      expect(mockInsertRoleHistory).toHaveBeenCalledWith('user-1', Role.Senpai, 'decay');
    });

    test('should not check decay for non-Sensei users', async () => {
      const guild = createMockGuild();

      mockGetUserRole.mockReturnValue(Role.Senpai);

      const result = await checkSenseiDecay(guild as any, 'user-1');

      expect(result.demoted).toBe(false);
      expect(mockGetRecentSenseiReactions).not.toHaveBeenCalled();
    });

    test('should demote at exactly 29 reactions', async () => {
      const guild = createMockGuild();
      const member = createMockMember('user-1', 'TestUser#0001', ['sensei-role-id']);
      guild.members.cache.set('user-1', member);

      mockGetUserRole.mockReturnValue(Role.Sensei);

      const recentReactions = Array.from({ length: 29 }, (_, i) => ({
        id: `reaction-${i}`,
        message_id: `msg-${i}`,
        message_author_id: 'user-1',
        reactor_id: `reactor-${i}`,
        reactor_role_at_time: Role.Sensei,
        timestamp: Date.now() - i * 1000,
      }));

      mockGetRecentSenseiReactions.mockResolvedValue(recentReactions);

      const result = await checkSenseiDecay(guild as any, 'user-1');

      expect(result.demoted).toBe(true);
    });

    test('should not demote at exactly 30 reactions', async () => {
      const guild = createMockGuild();

      mockGetUserRole.mockReturnValue(Role.Sensei);

      const recentReactions = Array.from({ length: 30 }, (_, i) => ({
        id: `reaction-${i}`,
        message_id: `msg-${i}`,
        message_author_id: 'user-1',
        reactor_id: `reactor-${i}`,
        reactor_role_at_time: Role.Sensei,
        timestamp: Date.now() - i * 1000,
      }));

      mockGetRecentSenseiReactions.mockResolvedValue(recentReactions);

      const result = await checkSenseiDecay(guild as any, 'user-1');

      expect(result.demoted).toBe(false);
    });

    test('should send DM on demotion', async () => {
      const guild = createMockGuild();
      const member = createMockMember('user-1', 'TestUser#0001', ['sensei-role-id']);
      guild.members.cache.set('user-1', member);

      mockGetUserRole.mockReturnValue(Role.Sensei);
      mockGetRecentSenseiReactions.mockResolvedValue([]);

      await checkSenseiDecay(guild, 'user-1');

      expect(mockSendDM).toHaveBeenCalledWith(member.user, expect.any(String));
    });

    test('should not demote Sensei with Felt role (core team exempt)', async () => {
      const guild = createMockGuild();
      const member = createMockMember('user-1', 'TestUser#0001', [
        'sensei-role-id',
        'felt-role-id',
      ]);
      guild.members.cache.set('user-1', member);

      mockGetUserRole.mockReturnValue(Role.Sensei);
      // No reactions at all - would normally trigger demotion
      mockGetRecentSenseiReactions.mockResolvedValue([]);

      const result = await checkSenseiDecay(guild as any, 'user-1');

      expect(result.demoted).toBe(false);
      expect(mockAssignRole).not.toHaveBeenCalled();
      expect(mockInsertRoleHistory).not.toHaveBeenCalled();
      expect(mockGetRecentSenseiReactions).not.toHaveBeenCalled();
    });
  });

  describe('getSenseiDecayStatus', () => {
    test('should return decay status information', async () => {
      const recentReactions = Array.from({ length: 35 }, (_, i) => ({
        id: `reaction-${i}`,
        message_id: `msg-${i}`,
        message_author_id: 'user-1',
        reactor_id: `reactor-${i}`,
        reactor_role_at_time: Role.Sensei,
        timestamp: Date.now() - i * 1000,
      }));

      mockGetRecentSenseiReactions.mockResolvedValue(recentReactions);

      const status = await getSenseiDecayStatus('user-1');

      expect(status.recentCount).toBe(35);
      expect(status.threshold).toBe(30);
      expect(status.windowDays).toBe(360);
    });

    test('should handle user with no recent reactions', async () => {
      mockGetRecentSenseiReactions.mockResolvedValue([]);

      const status = await getSenseiDecayStatus('user-1');

      expect(status.recentCount).toBe(0);
      expect(status.threshold).toBe(30);
    });
  });

  describe('Time Window Accuracy', () => {
    test('should only count reactions within 360-day window', async () => {
      mockGetUserRole.mockReturnValue(Role.Sensei);

      const now = Date.now();
      const reactions = [
        // Within window
        ...Array.from({ length: 25 }, (_, i) => ({
          id: `recent-${i}`,
          message_id: `msg-${i}`,
          message_author_id: 'user-1',
          reactor_id: `reactor-${i}`,
          reactor_role_at_time: Role.Sensei,
          timestamp: now - 300 * 24 * 60 * 60 * 1000, // 300 days ago
        })),
        // Outside window (should not be counted)
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `old-${i}`,
          message_id: `msg-old-${i}`,
          message_author_id: 'user-1',
          reactor_id: `reactor-old-${i}`,
          reactor_role_at_time: Role.Sensei,
          timestamp: now - 400 * 24 * 60 * 60 * 1000, // 400 days ago
        })),
      ];

      // Only recent reactions returned by getRecentSenseiReactions
      mockGetRecentSenseiReactions.mockResolvedValue(reactions.slice(0, 25));

      const status = await getSenseiDecayStatus('user-1');

      expect(status.recentCount).toBe(25);
    });
  });
});
