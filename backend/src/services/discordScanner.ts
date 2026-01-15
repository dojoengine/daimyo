import { Client, TextChannel, ChannelType, Collection, Message } from 'discord.js';
import { DiscordMessage } from '../types.js';
import { config } from '../utils/config.js';

/**
 * Minimum message length to consider for content pipeline
 */
const MIN_MESSAGE_LENGTH = 50;

/**
 * Maximum messages to fetch per channel (prevents excessive API calls)
 */
const MAX_MESSAGES_PER_CHANNEL = 1000;

/**
 * Scan configured Discord channels for recent messages
 */
export async function scanChannelsForMessages(
  client: Client,
  daysBack: number = config.contentPipelineDaysBack
): Promise<DiscordMessage[]> {
  const channelIds = config.contentChannelIds;

  if (channelIds.length === 0) {
    console.warn('No content channels configured (CONTENT_CHANNEL_IDS is empty)');
    return [];
  }

  console.log(
    `📨 Scanning ${channelIds.length} channels for messages from the past ${daysBack} days...`
  );

  const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  const allMessages: DiscordMessage[] = [];

  for (const channelId of channelIds) {
    try {
      const channelMessages = await scanChannel(client, channelId, cutoffTime);
      allMessages.push(...channelMessages);
    } catch (error) {
      console.error(`Error scanning channel ${channelId}:`, error);
    }
  }

  console.log(`✅ Found ${allMessages.length} messages from ${channelIds.length} channels`);
  return allMessages;
}

/**
 * Scan a single channel for messages after the cutoff time
 */
async function scanChannel(
  client: Client,
  channelId: string,
  cutoffTime: number
): Promise<DiscordMessage[]> {
  const channel = await client.channels.fetch(channelId);

  if (!channel) {
    console.warn(`Channel ${channelId} not found`);
    return [];
  }

  if (channel.type !== ChannelType.GuildText) {
    console.warn(`Channel ${channelId} is not a text channel (type: ${channel.type})`);
    return [];
  }

  const textChannel = channel as TextChannel;
  const messages: DiscordMessage[] = [];
  let lastMessageId: string | undefined;
  let fetchCount = 0;

  while (fetchCount < MAX_MESSAGES_PER_CHANNEL) {
    const fetched: Collection<string, Message> = await textChannel.messages.fetch({
      limit: 100,
      before: lastMessageId,
    });

    if (fetched.size === 0) {
      break;
    }

    for (const [, msg] of fetched) {
      // Stop if we've gone past the cutoff time
      if (msg.createdTimestamp < cutoffTime) {
        return messages;
      }

      // Filter: substantive content from non-bots
      if (isRelevantMessage(msg)) {
        messages.push(transformMessage(msg, textChannel));
      }
    }

    lastMessageId = fetched.last()?.id;
    fetchCount += fetched.size;
  }

  return messages;
}

/**
 * Check if a message is relevant for content pipeline
 */
function isRelevantMessage(msg: Message): boolean {
  // Exclude bot messages
  if (msg.author.bot) {
    return false;
  }

  // Exclude short messages
  if (msg.content.length < MIN_MESSAGE_LENGTH) {
    return false;
  }

  // Exclude messages that are just links/embeds
  if (isOnlyLinksOrEmoji(msg.content)) {
    return false;
  }

  return true;
}

/**
 * Check if content is only links, emoji, or whitespace
 */
function isOnlyLinksOrEmoji(content: string): boolean {
  // Remove URLs
  const withoutUrls = content.replace(/https?:\/\/\S+/g, '');
  // Remove emoji (both unicode and Discord custom)
  const withoutEmoji = withoutUrls
    .replace(/<:\w+:\d+>/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
  // Check if anything substantive remains
  return withoutEmoji.trim().length < 20;
}

/**
 * Transform a Discord.js Message to our DiscordMessage type
 */
function transformMessage(msg: Message, channel: TextChannel): DiscordMessage {
  return {
    id: msg.id,
    authorId: msg.author.id,
    authorName: msg.author.username,
    content: msg.content,
    timestamp: msg.createdTimestamp,
    channelId: channel.id,
    channelName: channel.name,
    url: msg.url,
  };
}

/**
 * Scan all text channels in the guild (alternative to configured channels)
 */
export async function scanAllChannels(
  client: Client,
  daysBack: number = config.contentPipelineDaysBack
): Promise<DiscordMessage[]> {
  const guild = await client.guilds.fetch(config.discordGuildId);
  const channels = guild.channels.cache.filter((ch) => ch.type === ChannelType.GuildText);

  console.log(`📨 Scanning all ${channels.size} text channels...`);

  const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  const allMessages: DiscordMessage[] = [];

  for (const [channelId] of channels) {
    try {
      const channelMessages = await scanChannel(client, channelId, cutoffTime);
      allMessages.push(...channelMessages);
    } catch (error) {
      console.error(`Error scanning channel ${channelId}:`, error);
    }
  }

  console.log(`✅ Found ${allMessages.length} messages from ${channels.size} channels`);
  return allMessages;
}
