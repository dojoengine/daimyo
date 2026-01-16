/**
 * Unit tests for reputation service
 */

import { jest, beforeEach, describe, test, expect } from '@jest/globals';
import { createMockGuild } from '../mocks/discord.js';

// Mock modules BEFORE importing them
const mockGetReactionCount = jest.fn();
const mockGetUniqueReactors = jest.fn();
const mockGetReactionBreakdown = jest.fn();
const mockInsertRoleHistory = jest.fn();
const mockGetUserRole = jest.fn();
const mockAssignRole = jest.fn();
const mockGetRoleCounts = jest.fn();
const mockSendDM = jest.fn();
const mockFormatPromotionMessage = jest.fn();

jest.unstable_mockModule('../../src/services/database.js', () => ({
  getReactionCount: mockGetReactionCount,
  getUniqueReactors: mockGetUniqueReactors,
  getReactionBreakdown: mockGetReactionBreakdown,
  insertRoleHistory: mockInsertRoleHistory,
}));

jest.unstable_mockModule('../../src/services/roleManager.js', () => ({
  getUserRole: mockGetUserRole,
  assignRole: mockAssignRole,
  getRoleCounts: mockGetRoleCounts,
  sendDM: mockSendDM,
  formatPromotionMessage: mockFormatPromotionMessage,
}));

jest.unstable_mockModule('../../src/utils/config.js', () => ({
  config: {
    senpaiReactionThreshold: 50,
    senpaiUniquePercent: 0.1,
    senseiReactionThreshold: 30,
    senseiUniquePercent: 0.2,
  },
}));

const { calculateSenpaiScore, calculateSenseiScore } =
  await import('../../src/services/reputation.js');

describe('Reputation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock return value
    mockFormatPromotionMessage.mockReturnValue('Promotion message');
  });

  describe('calculateSenpaiScore', () => {
    test('should calculate score correctly with sufficient reactions and diversity', async () => {
      const guild = createMockGuild();

      // Mock 100 total Senpai + Sensei
      mockGetRoleCounts.mockReturnValue({
        kohai: 50,
        senpai: 70,
        sensei: 30,
      });

      // User has 60 reactions from 15 unique users
      mockGetReactionCount.mockResolvedValue(60);
      mockGetUniqueReactors.mockResolvedValue(Array.from({ length: 15 }, (_, i) => `reactor-${i}`));

      const score = await calculateSenpaiScore(guild as any, 'user-1');

      expect(score.totalReactions).toBe(60);
      expect(score.uniqueReactors).toBe(15);
      expect(score.threshold).toBe(50);
      expect(score.uniqueRequired).toBe(10); // CEIL(100 * 0.10) = 10
      expect(score.meetsThreshold).toBe(true);
      expect(score.meetsUnique).toBe(true);
    });

    test('should fail when reactions below threshold', async () => {
      const guild = createMockGuild();

      mockGetRoleCounts.mockReturnValue({
        kohai: 50,
        senpai: 70,
        sensei: 30,
      });

      // Only 40 reactions (need 50)
      mockGetReactionCount.mockResolvedValue(40);
      mockGetUniqueReactors.mockResolvedValue(Array.from({ length: 15 }, (_, i) => `reactor-${i}`));

      const score = await calculateSenpaiScore(guild as any, 'user-1');

      expect(score.meetsThreshold).toBe(false);
      expect(score.meetsUnique).toBe(true);
    });

    test('should fail when unique reactors below requirement', async () => {
      const guild = createMockGuild();

      mockGetRoleCounts.mockReturnValue({
        kohai: 50,
        senpai: 70,
        sensei: 30,
      });

      // 60 reactions but only 5 unique (need 10)
      mockGetReactionCount.mockResolvedValue(60);
      mockGetUniqueReactors.mockResolvedValue(Array.from({ length: 5 }, (_, i) => `reactor-${i}`));

      const score = await calculateSenpaiScore(guild as any, 'user-1');

      expect(score.meetsThreshold).toBe(true);
      expect(score.meetsUnique).toBe(false);
    });

    test('should handle CEIL correctly for diversity requirement', async () => {
      const guild = createMockGuild();

      // 15 Senpai + Sensei total
      // CEIL(15 * 0.10) = CEIL(1.5) = 2
      mockGetRoleCounts.mockReturnValue({
        kohai: 50,
        senpai: 10,
        sensei: 5,
      });

      mockGetReactionCount.mockResolvedValue(50);
      mockGetUniqueReactors.mockResolvedValue(['reactor-1']);

      const score = await calculateSenpaiScore(guild as any, 'user-1');

      expect(score.uniqueRequired).toBe(2); // CEIL(15 * 0.10)
      expect(score.meetsUnique).toBe(false); // Only 1 unique, need 2
    });

    test('should require at least 1 unique reactor', async () => {
      const guild = createMockGuild();

      // Only 1 Senpai + Sensei total
      // CEIL(1 * 0.10) = CEIL(0.1) = 1
      // But Math.max(1, ...) ensures minimum of 1
      mockGetRoleCounts.mockReturnValue({
        kohai: 50,
        senpai: 1,
        sensei: 0,
      });

      mockGetReactionCount.mockResolvedValue(50);
      mockGetUniqueReactors.mockResolvedValue(['reactor-1']);

      const score = await calculateSenpaiScore(guild as any, 'user-1');

      expect(score.uniqueRequired).toBe(1);
      expect(score.meetsUnique).toBe(true);
    });
  });

  describe('calculateSenseiScore', () => {
    test('should calculate score correctly with sufficient Sensei reactions', async () => {
      const guild = createMockGuild();

      // 50 total Sensei
      mockGetRoleCounts.mockReturnValue({
        kohai: 100,
        senpai: 200,
        sensei: 50,
      });

      // User has 35 Sensei reactions from 12 unique Sensei
      mockGetReactionCount.mockResolvedValue(35);
      mockGetUniqueReactors.mockResolvedValue(Array.from({ length: 12 }, (_, i) => `sensei-${i}`));

      const score = await calculateSenseiScore(guild as any, 'user-1');

      expect(score.totalReactions).toBe(35);
      expect(score.uniqueReactors).toBe(12);
      expect(score.threshold).toBe(30);
      expect(score.uniqueRequired).toBe(10); // CEIL(50 * 0.20) = 10
      expect(score.meetsThreshold).toBe(true);
      expect(score.meetsUnique).toBe(true);
    });

    test('should fail with insufficient unique Sensei', async () => {
      const guild = createMockGuild();

      mockGetRoleCounts.mockReturnValue({
        kohai: 100,
        senpai: 200,
        sensei: 50,
      });

      // 35 reactions but only 8 unique (need 10)
      mockGetReactionCount.mockResolvedValue(35);
      mockGetUniqueReactors.mockResolvedValue(Array.from({ length: 8 }, (_, i) => `sensei-${i}`));

      const score = await calculateSenseiScore(guild as any, 'user-1');

      expect(score.meetsThreshold).toBe(true);
      expect(score.meetsUnique).toBe(false);
    });

    test('should handle small Sensei count correctly', async () => {
      const guild = createMockGuild();

      // Only 3 Sensei total
      // CEIL(3 * 0.20) = CEIL(0.6) = 1
      mockGetRoleCounts.mockReturnValue({
        kohai: 100,
        senpai: 200,
        sensei: 3,
      });

      mockGetReactionCount.mockResolvedValue(30);
      mockGetUniqueReactors.mockResolvedValue(['sensei-1']);

      const score = await calculateSenseiScore(guild as any, 'user-1');

      expect(score.uniqueRequired).toBe(1);
      expect(score.meetsUnique).toBe(true);
    });
  });

  describe('Diversity Requirements Edge Cases', () => {
    test('Senpai: 10% of 100 = 10 unique required', async () => {
      const guild = createMockGuild();

      mockGetRoleCounts.mockReturnValue({
        kohai: 0,
        senpai: 70,
        sensei: 30,
      });

      mockGetReactionCount.mockResolvedValue(50);
      mockGetUniqueReactors.mockResolvedValue([]);

      const score = await calculateSenpaiScore(guild as any, 'user-1');

      expect(score.uniqueRequired).toBe(10); // CEIL(100 * 0.10) = 10
    });

    test('Senpai: 10% of 35 = 4 unique required', async () => {
      const guild = createMockGuild();

      mockGetRoleCounts.mockReturnValue({
        kohai: 0,
        senpai: 25,
        sensei: 10,
      });

      mockGetReactionCount.mockResolvedValue(50);
      mockGetUniqueReactors.mockResolvedValue([]);

      const score = await calculateSenpaiScore(guild as any, 'user-1');

      expect(score.uniqueRequired).toBe(4); // CEIL(35 * 0.10) = 4
    });

    test('Sensei: 20% of 20 = 4 unique required', async () => {
      const guild = createMockGuild();

      mockGetRoleCounts.mockReturnValue({
        kohai: 0,
        senpai: 0,
        sensei: 20,
      });

      mockGetReactionCount.mockResolvedValue(30);
      mockGetUniqueReactors.mockResolvedValue([]);

      const score = await calculateSenseiScore(guild as any, 'user-1');

      expect(score.uniqueRequired).toBe(4); // CEIL(20 * 0.20) = 4
    });

    test('Sensei: 20% of 6 = 2 unique required', async () => {
      const guild = createMockGuild();

      mockGetRoleCounts.mockReturnValue({
        kohai: 0,
        senpai: 0,
        sensei: 6,
      });

      mockGetReactionCount.mockResolvedValue(30);
      mockGetUniqueReactors.mockResolvedValue([]);

      const score = await calculateSenseiScore(guild as any, 'user-1');

      expect(score.uniqueRequired).toBe(2); // CEIL(6 * 0.20) = 2
    });
  });
});
