import { Guild, GuildMember, User } from 'discord.js';
import { config } from '../utils/config.js';
import { Role, RoleCounts } from '../types.js';

/**
 * Map Role enum to Discord role IDs
 */
function getRoleId(role: Role): string {
  switch (role) {
    case Role.Kohai:
      return config.kohaiRoleId;
    case Role.Senpai:
      return config.senpaiRoleId;
    case Role.Sensei:
      return config.senseiRoleId;
  }
}

/**
 * Get a guild member's current reputation role
 */
export function getUserRole(guild: Guild, userId: string): Role | null {
  try {
    const member = guild.members.cache.get(userId);
    if (!member) {
      console.warn(`User ${userId} not found in guild cache`);
      return null;
    }

    // Check roles in priority order (Sensei > Senpai > Kohai)
    if (member.roles.cache.has(config.senseiRoleId)) {
      return Role.Sensei;
    }
    if (member.roles.cache.has(config.senpaiRoleId)) {
      return Role.Senpai;
    }
    if (member.roles.cache.has(config.kohaiRoleId)) {
      return Role.Kohai;
    }

    return null;
  } catch (error) {
    console.error(`Error getting user role for ${userId}:`, error);
    return null;
  }
}

/**
 * Assign a role to a user
 * Removes previous reputation roles to maintain hierarchy
 */
export async function assignRole(guild: Guild, userId: string, newRole: Role): Promise<void> {
  try {
    const member = guild.members.cache.get(userId);
    if (!member) {
      throw new Error(`User ${userId} not found in guild`);
    }

    const newRoleId = getRoleId(newRole);

    // Remove all reputation roles first
    const rolesToRemove = [config.kohaiRoleId, config.senpaiRoleId, config.senseiRoleId].filter(
      (roleId) => roleId !== newRoleId && member.roles.cache.has(roleId)
    );

    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove);
      console.debug(`Removed roles from ${userId}: ${rolesToRemove.join(', ')}`);
    }

    // Add new role
    await member.roles.add(newRoleId);
    console.log(`Assigned ${newRole} role to ${userId}`);
  } catch (error) {
    console.error(`Error assigning ${newRole} role to ${userId}:`, error);
    throw error;
  }
}

/**
 * Remove a specific role from a user
 */
export async function removeRole(guild: Guild, userId: string, role: Role): Promise<void> {
  try {
    const member = guild.members.cache.get(userId);
    if (!member) {
      throw new Error(`User ${userId} not found in guild`);
    }

    const roleId = getRoleId(role);
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      console.log(`Removed ${role} role from ${userId}`);
    }
  } catch (error) {
    console.error(`Error removing ${role} role from ${userId}:`, error);
    throw error;
  }
}

/**
 * Get counts of users in each role
 */
export function getRoleCounts(guild: Guild): RoleCounts {
  const kohaiRole = guild.roles.cache.get(config.kohaiRoleId);
  const senpaiRole = guild.roles.cache.get(config.senpaiRoleId);
  const senseiRole = guild.roles.cache.get(config.senseiRoleId);

  return {
    kohai: kohaiRole?.members.size || 0,
    senpai: senpaiRole?.members.size || 0,
    sensei: senseiRole?.members.size || 0,
  };
}

/**
 * Get all users with a specific role
 */
export function getUsersWithRole(guild: Guild, role: Role): GuildMember[] {
  const roleId = getRoleId(role);
  const discordRole = guild.roles.cache.get(roleId);

  if (!discordRole) {
    console.warn(`Role ${role} (${roleId}) not found in guild`);
    return [];
  }

  return Array.from(discordRole.members.values());
}

/**
 * Send a direct message to a user
 */
export async function sendDM(user: User, message: string): Promise<boolean> {
  try {
    await user.send(message);
    console.debug(`Sent DM to ${user.tag}: ${message}`);
    return true;
  } catch (error) {
    console.warn(`Failed to send DM to ${user.tag}:`, error);
    return false;
  }
}

/**
 * Format a promotion message
 */
export function formatPromotionMessage(newRole: Role): string {
  switch (newRole) {
    case Role.Senpai:
      return `🎌 Congratulations! You've been promoted to **Senpai**!\n\nYour contributions to the Dojo community have been recognized by your peers. You can now help promote others to Senpai by reacting to their helpful messages with :dojo:.`;
    case Role.Sensei:
      return `🎌 Congratulations! You've been promoted to **Sensei**!\n\nYou've achieved the highest reputation in the Dojo community. Your expertise is valued, and you can now help promote others to both Senpai and Sensei roles.\n\n*Note: To maintain Sensei status, you must receive at least 30 Sensei reactions within a 360-day rolling window.*`;
    default:
      return `🎌 You've been assigned the **${newRole}** role.`;
  }
}

/**
 * Format a demotion message
 */
export function formatDemotionMessage(oldRole: Role, newRole: Role, reason: string): string {
  return `🎌 Your role has changed from **${oldRole}** to **${newRole}**.\n\nReason: ${reason}\n\nDon't worry! You can regain your previous status by continuing to contribute to the community.`;
}
