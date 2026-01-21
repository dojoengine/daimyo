import { Client, GatewayIntentBits, GuildMember } from 'discord.js';
import { config } from './utils/config.js';

const DELAY_MS = 500; // Delay between role operations to avoid rate limits

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}`);

    try {
      const guild = await client.guilds.fetch(config.discordGuildId);
      console.log(`Found guild: ${guild.name}`);

      // Fetch all members once
      console.log('Fetching all members...');
      await guild.members.fetch();
      console.log(`Fetched ${guild.members.cache.size} members`);

      // Get role objects
      const feltRole = guild.roles.cache.get(config.feltRoleId);
      const senseiRole = guild.roles.cache.get(config.senseiRoleId);
      const senpaiRole = guild.roles.cache.get(config.senpaiRoleId);
      const kohaiRole = guild.roles.cache.get(config.kohaiRoleId);

      if (!feltRole) {
        console.error(`Felt role not found: ${config.feltRoleId}`);
        process.exit(1);
      }
      if (!senseiRole || !senpaiRole || !kohaiRole) {
        console.error('One or more reputation roles not found');
        process.exit(1);
      }

      console.log(`Felt role: ${feltRole.name} (${feltRole.members.size} members)`);
      console.log(`Sensei role: ${senseiRole.name} (${senseiRole.members.size} members)`);
      console.log(`Senpai role: ${senpaiRole.name} (${senpaiRole.members.size} members)`);
      console.log(`Kohai role: ${kohaiRole.name} (${kohaiRole.members.size} members)`);

      // Collect all members who need roles
      const needsSensei: GuildMember[] = [];
      const needsKohai: Set<GuildMember> = new Set();

      // Step 1: Find Felt members who need Sensei
      for (const [_userId, member] of feltRole.members) {
        if (!member.roles.cache.has(config.senseiRoleId)) {
          needsSensei.push(member);
        }
        // All Felt members will need Kohai too (after getting Sensei)
        if (!member.roles.cache.has(config.kohaiRoleId)) {
          needsKohai.add(member);
        }
      }

      // Step 2: Find existing Sensei/Senpai who need Kohai
      for (const [_userId, member] of senseiRole.members) {
        if (!member.roles.cache.has(config.kohaiRoleId)) {
          needsKohai.add(member);
        }
      }
      for (const [_userId, member] of senpaiRole.members) {
        if (!member.roles.cache.has(config.kohaiRoleId)) {
          needsKohai.add(member);
        }
      }

      console.log(`\nWill add Sensei to ${needsSensei.length} members`);
      console.log(`Will add Kohai to ${needsKohai.size} members`);

      // Apply Sensei roles with delay
      console.log('\n--- Adding Sensei roles ---');
      for (const member of needsSensei) {
        await member.roles.add(config.senseiRoleId);
        console.log(`Added Sensei to ${member.user.tag}`);
        await delay(DELAY_MS);
      }

      // Apply Kohai roles with delay
      console.log('\n--- Adding Kohai roles ---');
      for (const member of needsKohai) {
        await member.roles.add(config.kohaiRoleId);
        console.log(`Added Kohai to ${member.user.tag}`);
        await delay(DELAY_MS);
      }

      console.log('\n--- Final Counts ---');
      console.log(`Sensei added: ${needsSensei.length}`);
      console.log(`Kohai added: ${needsKohai.size}`);

      console.log('\nDone!');
    } catch (error) {
      console.error('Error:', error);
    }

    client.destroy();
    process.exit(0);
  });

  await client.login(config.discordBotToken);
}

main().catch(console.error);
