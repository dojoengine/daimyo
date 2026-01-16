import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Role } from '../types.js';
import { getLeaderboard } from '../services/database.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Display top users by reputation')
  .addStringOption((option) =>
    option
      .setName('role')
      .setDescription('Filter by reactor role')
      .setRequired(false)
      .addChoices(
        { name: 'Kōhai', value: 'Kohai' },
        { name: 'Senpai', value: 'Senpai' },
        { name: 'Sensei', value: 'Sensei' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply();

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply('This command can only be used in a server.');
      return;
    }

    // Get optional role filter
    const roleFilter = interaction.options.getString('role') as Role | null;

    // Get leaderboard data (top 20)
    const leaderboard = await getLeaderboard(roleFilter || undefined, 20);

    if (leaderboard.length === 0) {
      await interaction.editReply('No reputation data available yet.');
      return;
    }

    // Build leaderboard message
    const roleText = roleFilter ? ` (${roleFilter} reactions)` : '';
    let message = `🏆 **Daimyō Leaderboard${roleText}**\n\n`;

    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const user = await guild.members.fetch(entry.user_id).catch(() => null);
      const userName = user ? user.user.tag : `User ${entry.user_id}`;

      // Add medal emojis for top 3
      let prefix = `${i + 1}.`;
      if (i === 0) prefix = '🥇';
      else if (i === 1) prefix = '🥈';
      else if (i === 2) prefix = '🥉';

      const reactionText = roleFilter
        ? `${entry.reaction_count} ${roleFilter} reactions`
        : `${entry.reaction_count} reactions`;

      message += `${prefix} **${userName}** - ${reactionText}\n`;
    }

    await interaction.editReply(message);
    console.log(`Leaderboard command executed by ${interaction.user.tag}`);
  } catch (error) {
    console.error('Error executing leaderboard command:', error);
    await interaction.editReply('An error occurred while fetching the leaderboard.');
  }
}
