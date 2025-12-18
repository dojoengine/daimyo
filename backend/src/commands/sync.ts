import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { getUserRole } from '../services/roleManager.js';
import { checkPromotion } from '../services/reputation.js';
import { checkSenseiDecay } from '../services/decay.js';

export const data = new SlashCommandBuilder()
  .setName('daimyo-sync')
  .setDescription('[Admin] Manually sync all roles based on current reaction counts')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply('This command can only be used in a server.');
      return;
    }

    console.log(`Sync command initiated by ${interaction.user.tag}`);

    let message = '🔄 **Starting role sync...**\n\n';
    await interaction.editReply(message);

    // Fetch all members to ensure cache is up to date
    await guild.members.fetch();

    let promotionCount = 0;
    let demotionCount = 0;
    const changes: string[] = [];

    // Check all members for promotions and demotions
    for (const [userId, member] of guild.members.cache) {
      if (member.user.bot) continue;

      const currentRole = getUserRole(guild, userId);
      if (!currentRole) continue;

      // Check for promotion
      const promotionResult = await checkPromotion(guild, userId);
      if (promotionResult.promoted) {
        promotionCount++;
        changes.push(
          `✅ Promoted ${member.user.tag}: ${promotionResult.oldRole} → ${promotionResult.newRole}`
        );
        console.log(`Sync: Promoted ${userId} to ${promotionResult.newRole}`);
      }

      // Check for Sensei decay
      const demotionResult = await checkSenseiDecay(guild, userId);
      if (demotionResult.demoted) {
        demotionCount++;
        changes.push(
          `⬇️ Demoted ${member.user.tag}: ${demotionResult.oldRole} → ${demotionResult.newRole} (decay)`
        );
        console.log(`Sync: Demoted ${userId} due to decay`);
      }
    }

    // Build summary message
    message = '✅ **Role sync complete!**\n\n';
    message += `**Summary:**\n`;
    message += `- Promotions: ${promotionCount}\n`;
    message += `- Demotions: ${demotionCount}\n`;
    message += `- Total changes: ${promotionCount + demotionCount}\n\n`;

    if (changes.length > 0) {
      message += `**Changes:**\n`;
      // Limit to first 20 changes to avoid message length issues
      const displayChanges = changes.slice(0, 20);
      message += displayChanges.join('\n');

      if (changes.length > 20) {
        message += `\n\n_...and ${changes.length - 20} more changes_`;
      }
    } else {
      message += '_No role changes needed._';
    }

    await interaction.editReply(message);
    console.log(`Sync complete: ${promotionCount} promotions, ${demotionCount} demotions`);
  } catch (error) {
    console.error('Error executing sync command:', error);
    await interaction.editReply('An error occurred during sync.');
  }
}
