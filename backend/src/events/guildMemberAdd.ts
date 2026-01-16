import { Client, Events, GuildMember } from 'discord.js';
import { Role } from '../types.js';
import { assignRole } from '../services/roleManager.js';
import { insertRoleHistory } from '../services/database.js';

/**
 * Handler for when a new member joins the guild
 * Automatically assigns Kōhai role
 */
export function registerGuildMemberAddHandler(client: Client): void {
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
      console.log(`New member joined: ${member.user.tag} (${member.id})`);

      // Assign Kōhai role
      await assignRole(member.guild, member.id, Role.Kohai);
      await insertRoleHistory(member.id, Role.Kohai, 'manual');

      console.log(`Assigned Kōhai role to ${member.user.tag}`);
    } catch (error) {
      console.error(`Error assigning Kōhai role to ${member.user.tag}:`, error);
    }
  });
}
