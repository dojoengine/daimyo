/**
 * Mock utilities for Discord.js objects
 * Used to test bot functionality without connecting to Discord
 */

import { jest } from '@jest/globals';
import { Collection } from 'discord.js';
import { Role } from '../../src/types.js';

/**
 * Mock Discord Guild Member
 */
export function createMockMember(userId: string, username: string, roles: string[] = []) {
  const roleCache = new Collection<string, any>();

  roles.forEach((roleId) => {
    roleCache.set(roleId, { id: roleId });
  });

  return {
    id: userId,
    user: {
      id: userId,
      tag: username,
      username: username.split('#')[0],
      discriminator: username.split('#')[1] || '0000',
      bot: false,
      send: jest.fn().mockResolvedValue(undefined),
    },
    guild: createMockGuild(),
    roles: {
      cache: roleCache,
      add: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    },
  };
}

/**
 * Mock Discord Guild
 */
export function createMockGuild(guildId: string = 'test-guild-id', members: any[] = []) {
  const memberCache = new Collection();
  members.forEach((member) => {
    memberCache.set(member.id, member);
  });

  const roleCache = new Collection();

  // Add default reputation roles
  roleCache.set('kohai-role-id', {
    id: 'kohai-role-id',
    name: 'Kōhai',
    members: new Collection(),
  });
  roleCache.set('senpai-role-id', {
    id: 'senpai-role-id',
    name: 'Senpai',
    members: new Collection(),
  });
  roleCache.set('sensei-role-id', {
    id: 'sensei-role-id',
    name: 'Sensei',
    members: new Collection(),
  });

  return {
    id: guildId,
    name: 'Test Guild',
    members: {
      cache: memberCache,
      fetch: jest.fn().mockResolvedValue(memberCache),
    },
    roles: {
      cache: roleCache,
    },
  };
}

/**
 * Mock Discord Message
 */
export function createMockMessage(
  messageId: string,
  authorId: string,
  content: string = 'Test message'
) {
  return {
    id: messageId,
    content,
    author: {
      id: authorId,
      tag: `User#${authorId.slice(0, 4)}`,
      bot: false,
    },
    guild: createMockGuild(),
    channel: {
      id: 'test-channel-id',
      name: 'test-channel',
    },
  };
}

/**
 * Mock Discord Reaction
 */
export function createMockReaction(
  messageId: string,
  authorId: string,
  emojiName: string = 'dojo'
) {
  return {
    emoji: {
      name: emojiName,
      id: null,
    },
    message: createMockMessage(messageId, authorId),
    partial: false,
    fetch: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Mock Discord User
 */
export function createMockUser(userId: string, username: string) {
  return {
    id: userId,
    tag: username,
    username: username.split('#')[0],
    discriminator: username.split('#')[1] || '0000',
    bot: false,
    partial: false,
    fetch: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Mock Discord Interaction (for slash commands)
 */
export function createMockInteraction(
  userId: string,
  commandName: string,
  options: Map<string, any> = new Map()
) {
  return {
    user: createMockUser(userId, `User#${userId.slice(0, 4)}`),
    guild: createMockGuild(),
    commandName,
    options: {
      getUser: (key: string) => options.get(key) || null,
      getString: (key: string) => options.get(key) || null,
      get: (key: string) => options.get(key) || null,
    },
    reply: jest.fn().mockResolvedValue(undefined),
    editReply: jest.fn().mockResolvedValue(undefined),
    deferReply: jest.fn().mockResolvedValue(undefined),
    followUp: jest.fn().mockResolvedValue(undefined),
    replied: false,
    deferred: false,
  };
}

/**
 * Helper to add members to a guild with specific roles
 */
export function addMemberToGuild(guild: any, member: any, role: Role) {
  guild.members.cache.set(member.id, member);

  const roleId = getRoleIdForRole(role);
  const discordRole = guild.roles.cache.get(roleId);

  if (discordRole) {
    if (!discordRole.members) {
      discordRole.members = new Collection();
    }
    discordRole.members.set(member.id, member);
    member.roles.cache.set(roleId, { id: roleId });
  }
}

/**
 * Get role ID for a Role enum value
 */
function getRoleIdForRole(role: Role): string {
  switch (role) {
    case Role.Kohai:
      return 'kohai-role-id';
    case Role.Senpai:
      return 'senpai-role-id';
    case Role.Sensei:
      return 'sensei-role-id';
  }
}
