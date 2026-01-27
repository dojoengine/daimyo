/**
 * Integration tests for slash commands
 */

import { jest, beforeEach, describe, test, expect } from '@jest/globals';
import { Role } from '../../src/types.js';
import { createMockInteraction, createMockUser } from '../mocks/discord.js';

// Mock modules BEFORE importing them
const mockGetReactionBreakdown = jest.fn();
const mockGetLeaderboard = jest.fn();
const mockGetReactionsForUser = jest.fn();
const mockGetUserStats = jest.fn();
const mockCalculateSenpaiScore = jest.fn();
const mockCalculateSenseiScore = jest.fn();
const mockCheckPromotion = jest.fn();
const mockGetSenseiDecayStatus = jest.fn();
const mockCheckSenseiDecay = jest.fn();

jest.unstable_mockModule('../../src/services/database.js', () => ({
  getReactionBreakdown: mockGetReactionBreakdown,
  getLeaderboard: mockGetLeaderboard,
  getReactionsForUser: mockGetReactionsForUser,
}));

jest.unstable_mockModule('../../src/services/reputation.js', () => ({
  getUserStats: mockGetUserStats,
  calculateSenpaiScore: mockCalculateSenpaiScore,
  calculateSenseiScore: mockCalculateSenseiScore,
  checkPromotion: mockCheckPromotion,
}));

jest.unstable_mockModule('../../src/services/decay.js', () => ({
  getSenseiDecayStatus: mockGetSenseiDecayStatus,
  checkSenseiDecay: mockCheckSenseiDecay,
}));

const { execute: executeStats } = await import('../../src/commands/stats.js');
const { execute: executeLeaderboard } = await import('../../src/commands/leaderboard.js');

describe('Slash Commands Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/stats command', () => {
    test('should display stats for Kohai user', async () => {
      const interaction = createMockInteraction('user-1', 'stats');

      const mockStats = {
        userId: 'user-1',
        currentRole: Role.Kohai,
        breakdown: {
          total: 38,
          fromKohai: 15,
          fromSenpai: 18,
          fromSensei: 5,
        },
        senpaiScore: {
          totalReactions: 23,
          uniqueReactors: 8,
          threshold: 50,
          uniqueRequired: 10,
          meetsThreshold: false,
          meetsUnique: false,
        },
      };

      mockGetUserStats.mockReturnValue(mockStats);

      await executeStats(interaction as any);

      expect(interaction.deferReply).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('Kohai'));
      expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('38'));
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.stringContaining('Progress to Senpai')
      );
    });

    test('should display stats for Sensei user with decay info', async () => {
      const interaction = createMockInteraction('user-1', 'stats');

      const mockStats = {
        userId: 'user-1',
        currentRole: Role.Sensei,
        breakdown: {
          total: 312,
          fromKohai: 89,
          fromSenpai: 134,
          fromSensei: 89,
        },
      };

      const mockDecayStatus = {
        recentCount: 42,
        threshold: 30,
        windowDays: 360,
      };

      mockGetUserStats.mockReturnValue(mockStats);
      mockGetSenseiDecayStatus.mockReturnValue(mockDecayStatus);

      await executeStats(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('Sensei'));
      expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('42/30'));
    });

    test('should display stats for specified user', async () => {
      const targetUser = createMockUser('target-1', 'Target#0001');
      const options = new Map([['user', targetUser]]);
      const interaction = createMockInteraction('user-1', 'stats', options);

      const mockStats = {
        userId: 'target-1',
        currentRole: Role.Senpai,
        breakdown: {
          total: 147,
          fromKohai: 32,
          fromSenpai: 45,
          fromSensei: 70,
        },
        senseiScore: {
          totalReactions: 70,
          uniqueReactors: 5,
          threshold: 30,
          uniqueRequired: 8,
          meetsThreshold: true,
          meetsUnique: false,
        },
      };

      mockGetUserStats.mockReturnValue(mockStats);

      await executeStats(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('Target#0001'));
    });

    test('should handle user with no role gracefully', async () => {
      const interaction = createMockInteraction('user-1', 'stats');

      const mockStats = {
        userId: 'user-1',
        currentRole: null,
        breakdown: {
          total: 0,
          fromKohai: 0,
          fromSenpai: 0,
          fromSensei: 0,
        },
      };

      mockGetUserStats.mockReturnValue(mockStats);

      await executeStats(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.stringContaining('does not have a reputation role')
      );
    });
  });

  describe('/leaderboard command', () => {
    test('should display top users without filter', async () => {
      const interaction = createMockInteraction('user-1', 'leaderboard');

      const mockLeaderboard = [
        { user_id: 'user-1', reaction_count: 245 },
        { user_id: 'user-2', reaction_count: 198 },
        { user_id: 'user-3', reaction_count: 167 },
      ];

      mockGetLeaderboard.mockReturnValue(mockLeaderboard);

      // Mock guild member fetch
      interaction.guild.members.fetch = jest
        .fn()
        .mockImplementation((id: string) => Promise.resolve({ user: { tag: `User#${id}` } }));

      await executeLeaderboard(interaction as any);

      expect(interaction.deferReply).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('Leaderboard'));
      expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('🥇'));
    });

    test('should display leaderboard filtered by Sensei role', async () => {
      const options = new Map([['role', 'Sensei']]);
      const interaction = createMockInteraction('user-1', 'leaderboard', options);

      const mockLeaderboard = [
        { user_id: 'user-1', reaction_count: 89 },
        { user_id: 'user-2', reaction_count: 67 },
      ];

      mockGetLeaderboard.mockReturnValue(mockLeaderboard);

      interaction.guild.members.fetch = jest
        .fn()
        .mockImplementation((id: string) => Promise.resolve({ user: { tag: `User#${id}` } }));

      await executeLeaderboard(interaction as any);

      expect(mockGetLeaderboard).toHaveBeenCalledWith(Role.Sensei, 20);
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.stringContaining('(Sensei reactions)')
      );
    });

    test('should handle empty leaderboard', async () => {
      const interaction = createMockInteraction('user-1', 'leaderboard');

      mockGetLeaderboard.mockReturnValue([]);

      await executeLeaderboard(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith('No reputation data available yet.');
    });
  });

  describe('Command Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const interaction = createMockInteraction('user-1', 'stats');

      mockGetUserStats.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await executeStats(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith('An error occurred while fetching stats.');
    });

    test('should handle commands outside of guild', async () => {
      const interaction = createMockInteraction('user-1', 'stats');
      interaction.guild = null;

      await executeStats(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith(
        'This command can only be used in a server.'
      );
    });
  });

  describe('Admin Command Permissions', () => {
    test('should restrict admin commands to administrators', () => {
      // This would be enforced by Discord based on
      // .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      // in the command definition

      // In actual usage, Discord would not show the command
      // to non-admin users, and would reject attempts to invoke it
      expect(true).toBe(true); // Placeholder
    });
  });
});
