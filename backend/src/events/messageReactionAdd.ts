import {
  Client,
  Events,
  MessageReaction,
  PartialMessageReaction,
  User,
  PartialUser,
} from 'discord.js';
import { config } from '../utils/config.js';
import { insertReaction } from '../services/database.js';
import { getUserRole } from '../services/roleManager.js';
import { checkPromotion } from '../services/reputation.js';

/**
 * Check if reaction is the :dojo: emoji
 */
function isDojoEmoji(reaction: MessageReaction | PartialMessageReaction): boolean {
  // Check by emoji name
  if (reaction.emoji.name === config.dojoEmojiName) {
    return true;
  }

  // If custom emoji ID is configured, also check by ID
  if (config.dojoEmojiId && reaction.emoji.id === config.dojoEmojiId) {
    return true;
  }

  return false;
}

/**
 * Handler for when a reaction is added to a message
 * Tracks :dojo: reactions and checks for promotions
 */
export function registerMessageReactionAddHandler(client: Client): void {
  client.on(
    Events.MessageReactionAdd,
    async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
      try {
        // Fetch partial data if needed
        if (reaction.partial) {
          await reaction.fetch();
        }
        if (user.partial) {
          await user.fetch();
        }

        // Ignore bot reactions
        if (user.bot) {
          return;
        }

        // Only process :dojo: reactions
        if (!isDojoEmoji(reaction)) {
          return;
        }

        // Get the message and author
        const message = reaction.message;
        const messageAuthorId = message.author?.id;

        if (!messageAuthorId) {
          console.warn('Message author not available, skipping reaction');
          return;
        }

        const reactorId = user.id;

        // Rule: No self-reactions
        if (messageAuthorId === reactorId) {
          console.debug(`Self-reaction ignored: ${reactorId}`);
          return;
        }

        // Get reactor's current role
        const guild = message.guild;
        if (!guild) {
          console.warn('Guild not available for reaction, skipping');
          return;
        }

        const reactorRole = getUserRole(guild, reactorId);
        if (!reactorRole) {
          console.warn(`Reactor ${reactorId} has no reputation role, skipping`);
          return;
        }

        // Insert reaction into database (UNIQUE constraint handles duplicates)
        const inserted = await insertReaction(message.id, messageAuthorId, reactorId, reactorRole);

        if (inserted) {
          console.log(
            `📊 New :dojo: reaction: ${user.tag} (${reactorRole}) -> message by ${message.author?.tag} (${messageAuthorId})`
          );

          // Check if this reaction triggers a promotion
          const promotionResult = await checkPromotion(guild, messageAuthorId);

          if (promotionResult.promoted) {
            console.log(
              `🎉 Promotion triggered: ${messageAuthorId} ${promotionResult.oldRole} -> ${promotionResult.newRole}`
            );
          }
        }
      } catch (error) {
        console.error('Error handling reaction add:', error);
      }
    }
  );
}
