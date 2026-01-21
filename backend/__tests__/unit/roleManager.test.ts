/**
 * Unit tests for roleManager service
 */

import { jest, beforeEach, describe, test, expect } from '@jest/globals';
import { Collection } from 'discord.js';
import { Role } from '../../src/types.js';

// Mock config BEFORE importing roleManager
jest.unstable_mockModule('../../src/utils/config.js', () => ({
  config: {
    kohaiRoleId: 'kohai-role-id',
    senpaiRoleId: 'senpai-role-id',
    senseiRoleId: 'sensei-role-id',
  },
}));

const {
  getUserRole,
  assignRole,
  removeRole,
  getRoleCounts,
  getUsersWithRole,
  sendDM,
  formatPromotionMessage,
  formatDemotionMessage,
} = await import('../../src/services/roleManager.js');

/**
 * Create a mock guild with role structure
 */
function createTestGuild() {
  const memberCache = new Collection<string, any>();

  const kohaiMembers = new Collection<string, any>();
  const senpaiMembers = new Collection<string, any>();
  const senseiMembers = new Collection<string, any>();

  const roleCache = new Collection<string, any>();
  roleCache.set('kohai-role-id', {
    id: 'kohai-role-id',
    name: 'Kōhai',
    members: kohaiMembers,
  });
  roleCache.set('senpai-role-id', {
    id: 'senpai-role-id',
    name: 'Senpai',
    members: senpaiMembers,
  });
  roleCache.set('sensei-role-id', {
    id: 'sensei-role-id',
    name: 'Sensei',
    members: senseiMembers,
  });

  return {
    id: 'test-guild',
    members: { cache: memberCache },
    roles: { cache: roleCache },
    _addMember: (member: any, role?: Role) => {
      memberCache.set(member.id, member);
      if (role) {
        const roleId =
          role === Role.Kohai
            ? 'kohai-role-id'
            : role === Role.Senpai
              ? 'senpai-role-id'
              : 'sensei-role-id';
        member.roles.cache.set(roleId, { id: roleId });
        roleCache.get(roleId)?.members.set(member.id, member);
      }
    },
  };
}

/**
 * Create a mock member
 */
function createTestMember(id: string, tag: string) {
  const roleCache = new Collection<string, any>();
  return {
    id,
    user: {
      id,
      tag,
      send: jest.fn().mockResolvedValue(undefined),
    },
    roles: {
      cache: roleCache,
      add: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    },
  };
}

describe('RoleManager Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRole', () => {
    test('should return Sensei for user with Sensei role', () => {
      const guild = createTestGuild();
      const member = createTestMember('user-1', 'User#0001');
      guild._addMember(member, Role.Sensei);

      const role = getUserRole(guild as any, 'user-1');

      expect(role).toBe(Role.Sensei);
    });

    test('should return Senpai for user with Senpai role', () => {
      const guild = createTestGuild();
      const member = createTestMember('user-1', 'User#0001');
      guild._addMember(member, Role.Senpai);

      const role = getUserRole(guild as any, 'user-1');

      expect(role).toBe(Role.Senpai);
    });

    test('should return Kohai for user with Kohai role', () => {
      const guild = createTestGuild();
      const member = createTestMember('user-1', 'User#0001');
      guild._addMember(member, Role.Kohai);

      const role = getUserRole(guild as any, 'user-1');

      expect(role).toBe(Role.Kohai);
    });

    test('should return Sensei when user has multiple roles (priority)', () => {
      const guild = createTestGuild();
      const member = createTestMember('user-1', 'User#0001');
      guild._addMember(member);
      // Manually add multiple roles
      member.roles.cache.set('kohai-role-id', { id: 'kohai-role-id' });
      member.roles.cache.set('senpai-role-id', { id: 'senpai-role-id' });
      member.roles.cache.set('sensei-role-id', { id: 'sensei-role-id' });

      const role = getUserRole(guild as any, 'user-1');

      expect(role).toBe(Role.Sensei); // Highest priority
    });

    test('should return null for user not in guild', () => {
      const guild = createTestGuild();

      const role = getUserRole(guild as any, 'nonexistent-user');

      expect(role).toBeNull();
    });

    test('should return null for user without reputation roles', () => {
      const guild = createTestGuild();
      const member = createTestMember('user-1', 'User#0001');
      guild._addMember(member); // No role assigned

      const role = getUserRole(guild as any, 'user-1');

      expect(role).toBeNull();
    });
  });

  describe('assignRole', () => {
    test('should add new role to user', async () => {
      const guild = createTestGuild();
      const member = createTestMember('user-1', 'User#0001');
      guild._addMember(member);

      await assignRole(guild as any, 'user-1', Role.Kohai);

      expect(member.roles.add).toHaveBeenCalledWith('kohai-role-id');
    });

    test('should not remove Kohai when assigning new role (Kohai gates channel access)', async () => {
      const guild = createTestGuild();
      const member = createTestMember('user-1', 'User#0001');
      guild._addMember(member, Role.Kohai);

      await assignRole(guild as any, 'user-1', Role.Senpai);

      // Kohai should NOT be removed (it gates channel access)
      expect(member.roles.remove).not.toHaveBeenCalled();
      expect(member.roles.add).toHaveBeenCalledWith('senpai-role-id');
    });

    test('should only remove Senpai/Sensei roles, never Kohai', async () => {
      const guild = createTestGuild();
      const member = createTestMember('user-1', 'User#0001');
      guild._addMember(member);
      // Add multiple roles manually
      member.roles.cache.set('kohai-role-id', { id: 'kohai-role-id' });
      member.roles.cache.set('senpai-role-id', { id: 'senpai-role-id' });

      await assignRole(guild as any, 'user-1', Role.Sensei);

      // Only Senpai should be removed, not Kohai (Kohai gates channel access)
      expect(member.roles.remove).toHaveBeenCalledWith(['senpai-role-id']);
      expect(member.roles.add).toHaveBeenCalledWith('sensei-role-id');
    });

    test('should throw error for user not in guild', async () => {
      const guild = createTestGuild();

      await expect(assignRole(guild as any, 'nonexistent', Role.Kohai)).rejects.toThrow(
        'User nonexistent not found in guild'
      );
    });
  });

  describe('removeRole', () => {
    test('should remove role from user', async () => {
      const guild = createTestGuild();
      const member = createTestMember('user-1', 'User#0001');
      guild._addMember(member, Role.Senpai);

      await removeRole(guild as any, 'user-1', Role.Senpai);

      expect(member.roles.remove).toHaveBeenCalledWith('senpai-role-id');
    });

    test('should not call remove if user does not have the role', async () => {
      const guild = createTestGuild();
      const member = createTestMember('user-1', 'User#0001');
      guild._addMember(member); // No role

      await removeRole(guild as any, 'user-1', Role.Senpai);

      expect(member.roles.remove).not.toHaveBeenCalled();
    });

    test('should throw error for user not in guild', async () => {
      const guild = createTestGuild();

      await expect(removeRole(guild as any, 'nonexistent', Role.Kohai)).rejects.toThrow(
        'User nonexistent not found in guild'
      );
    });
  });

  describe('getRoleCounts', () => {
    test('should return correct counts for each role', () => {
      const guild = createTestGuild();

      // Add members with different roles
      for (let i = 0; i < 10; i++) {
        const member = createTestMember(`kohai-${i}`, `Kohai${i}#0001`);
        guild._addMember(member, Role.Kohai);
      }
      for (let i = 0; i < 5; i++) {
        const member = createTestMember(`senpai-${i}`, `Senpai${i}#0001`);
        guild._addMember(member, Role.Senpai);
      }
      for (let i = 0; i < 3; i++) {
        const member = createTestMember(`sensei-${i}`, `Sensei${i}#0001`);
        guild._addMember(member, Role.Sensei);
      }

      const counts = getRoleCounts(guild as any);

      expect(counts.kohai).toBe(10);
      expect(counts.senpai).toBe(5);
      expect(counts.sensei).toBe(3);
    });

    test('should return 0 for empty roles', () => {
      const guild = createTestGuild();

      const counts = getRoleCounts(guild as any);

      expect(counts.kohai).toBe(0);
      expect(counts.senpai).toBe(0);
      expect(counts.sensei).toBe(0);
    });
  });

  describe('getUsersWithRole', () => {
    test('should return all members with specified role', () => {
      const guild = createTestGuild();

      for (let i = 0; i < 5; i++) {
        const member = createTestMember(`senpai-${i}`, `Senpai${i}#0001`);
        guild._addMember(member, Role.Senpai);
      }

      const users = getUsersWithRole(guild as any, Role.Senpai);

      expect(users).toHaveLength(5);
    });

    test('should return empty array for role with no members', () => {
      const guild = createTestGuild();

      const users = getUsersWithRole(guild as any, Role.Sensei);

      expect(users).toHaveLength(0);
    });
  });

  describe('sendDM', () => {
    test('should send message to user and return true', async () => {
      const user = {
        tag: 'User#0001',
        send: jest.fn().mockResolvedValue(undefined),
      };

      const result = await sendDM(user as any, 'Test message');

      expect(result).toBe(true);
      expect(user.send).toHaveBeenCalledWith('Test message');
    });

    test('should return false when DM fails', async () => {
      const user = {
        tag: 'User#0001',
        send: jest.fn().mockRejectedValue(new Error('DMs disabled')),
      };

      const result = await sendDM(user as any, 'Test message');

      expect(result).toBe(false);
    });
  });

  describe('formatPromotionMessage', () => {
    test('should format Senpai promotion message', () => {
      const message = formatPromotionMessage(Role.Senpai);

      expect(message).toContain('Senpai');
      expect(message).toContain('Congratulations');
    });

    test('should format Sensei promotion message with decay note', () => {
      const message = formatPromotionMessage(Role.Sensei);

      expect(message).toContain('Sensei');
      expect(message).toContain('Congratulations');
      expect(message).toContain('30 Sensei reactions');
      expect(message).toContain('360-day');
    });

    test('should format Kohai assignment message', () => {
      const message = formatPromotionMessage(Role.Kohai);

      expect(message).toContain('Kohai');
    });
  });

  describe('formatDemotionMessage', () => {
    test('should format demotion message with reason', () => {
      const message = formatDemotionMessage(Role.Sensei, Role.Senpai, 'Insufficient activity');

      expect(message).toContain('Sensei');
      expect(message).toContain('Senpai');
      expect(message).toContain('Insufficient activity');
    });
  });
});
