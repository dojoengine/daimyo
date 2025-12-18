import { Client, Events } from 'discord.js';
import { config } from '../utils/config.js';
import { getRoleCounts } from '../services/roleManager.js';

/**
 * Handler for when the bot is ready
 */
export function registerReadyHandler(client: Client): void {
  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`✅ Bot is ready! Logged in as ${readyClient.user.tag}`);

    try {
      // Fetch the guild
      const guild = await client.guilds.fetch(config.discordGuildId);
      console.log(`Connected to guild: ${guild.name} (${guild.id})`);

      // Fetch all members to populate cache
      console.log('Fetching all guild members...');
      await guild.members.fetch();
      console.log(`Cached ${guild.members.cache.size} members`);

      // Log role distribution
      const roleCounts = getRoleCounts(guild);
      console.log(
        `Role distribution: ${roleCounts.kohai} Kōhai, ${roleCounts.senpai} Senpai, ${roleCounts.sensei} Sensei`
      );

      // Verify roles exist
      const kohaiRole = guild.roles.cache.get(config.kohaiRoleId);
      const senpaiRole = guild.roles.cache.get(config.senpaiRoleId);
      const senseiRole = guild.roles.cache.get(config.senseiRoleId);

      if (!kohaiRole) console.warn(`⚠️  Kōhai role (${config.kohaiRoleId}) not found in guild`);
      if (!senpaiRole) console.warn(`⚠️  Senpai role (${config.senpaiRoleId}) not found in guild`);
      if (!senseiRole) console.warn(`⚠️  Sensei role (${config.senseiRoleId}) not found in guild`);

      if (kohaiRole && senpaiRole && senseiRole) {
        console.log('✅ All reputation roles verified');
      }

      console.log('🎌 Daimyō bot is fully operational');
    } catch (error) {
      console.error('Error during bot initialization:', error);
    }
  });
}
