import { randomUUID } from 'crypto';
import { DiscordMessage, Story, ThreadContent } from '../../types.js';

/**
 * Shared prompt and parsing helpers for LLM providers.
 */
const DEFAULT_HASHTAGS = ['#Dojo', '#GameDev'];

export function formatMessagesForStoryPrompt(
  messages: DiscordMessage[],
  maxMessages: number = 500
): string {
  return messages
    .slice(0, maxMessages)
    .map((m) => `[${m.authorName} in #${m.channelName}]: ${m.content}`)
    .join('\n\n');
}

export function buildStoryIdentificationPrompt(
  formattedMessages: string,
  maxStories: number
): { system: string; user: string } {
  const system = `You are an expert content curator for the Dojo community (an onchain game engine).
Your task is to identify interesting stories from Discord messages that would make compelling Twitter threads.

A good story:
- Highlights interesting Dojo functionality or features
- Shows a developer using Dojo creatively to solve a problem
- Demonstrates solving a hard technical or creative challenge
- Has a clear narrative arc (problem → solution → outcome)

For each story, provide:
1. A compelling title
2. A brief summary (2-3 sentences)
3. The Discord message IDs that are part of this story
4. A confidence score (0-1) based on how interesting/compelling the story is
5. A suggested image prompt for a visual hook

Return your response as a JSON array of stories.`;

  const user = `Analyze these Discord messages and identify up to ${maxStories} interesting stories about developers using Dojo:

${formattedMessages}

Return a JSON array with this structure:
[
  {
    "title": "Story title",
    "summary": "Brief summary of the story",
    "messageIds": ["id1", "id2"],
    "confidence": 0.85,
    "imagePrompt": "A prompt for generating a visual"
  }
]

Only include stories with confidence > 0.6. If no interesting stories are found, return an empty array.`;

  return { system, user };
}

export function buildThreadGenerationPrompt(story: Story): { system: string; user: string } {
  const sourceContent = story.sourceMessages
    .map((m) => `${m.authorName}: ${m.content}`)
    .join('\n\n');

  const system = `You are an expert Twitter thread writer for the Dojo community (an onchain game engine).
Your task is to write engaging Twitter threads that tell developer stories.

Guidelines:
- Each tweet must be under 280 characters
- Use a conversational, engaging tone
- Start with a hook that grabs attention
- Include technical details where relevant
- Credit the original author from Discord
- End with a call to action or reflection
- Generate 3-7 tweets per thread
- Include relevant hashtags (Dojo, GameDev, Web3, etc.)`;

  const user = `Write a Twitter thread about this story:

Title: ${story.title}
Summary: ${story.summary}

Source content from Discord:
${sourceContent}

Return a JSON object with this structure:
{
  "tweets": ["Tweet 1 text", "Tweet 2 text", ...],
  "hashtags": ["#Dojo", "#GameDev", ...]
}

Make sure each tweet is under 280 characters. The last tweet should include the hashtags.`;

  return { system, user };
}

interface RawStory {
  title: string;
  summary: string;
  messageIds: string[];
  confidence: number;
  imagePrompt: string;
}

function isRawStory(raw: unknown): raw is RawStory {
  if (!raw || typeof raw !== 'object') {
    return false;
  }

  const r = raw as Record<string, unknown>;
  return (
    typeof r.title === 'string' &&
    typeof r.summary === 'string' &&
    Array.isArray(r.messageIds) &&
    typeof r.confidence === 'number' &&
    typeof r.imagePrompt === 'string'
  );
}

export function normalizeStoriesFromModel(
  rawStories: unknown[],
  messages: DiscordMessage[]
): Story[] {
  const stories: Story[] = rawStories.filter(isRawStory).map((raw) => ({
    id: randomUUID(),
    title: raw.title,
    summary: raw.summary,
    sourceMessages: messages.filter((m) => raw.messageIds.includes(m.id)),
    confidence: raw.confidence,
    suggestedImagePrompt: raw.imagePrompt,
  }));

  return stories.sort((a, b) => b.confidence - a.confidence);
}

export function extractJsonArray(content: string): string | null {
  const match = content.match(/\[[\s\S]*\]/);
  return match ? match[0] : null;
}

export function extractJsonObject(content: string): string | null {
  const match = content.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

export function normalizeThreadContent(parsed: Record<string, unknown>): ThreadContent {
  const rawTweets = Array.isArray(parsed.tweets) ? parsed.tweets : [];
  const tweets = rawTweets
    .filter((tweet): tweet is string => typeof tweet === 'string')
    .map((tweet) => {
      if (tweet.length > 280) {
        console.warn(`Tweet exceeds 280 chars, truncating: ${tweet.substring(0, 50)}...`);
        return `${tweet.substring(0, 277)}...`;
      }
      return tweet;
    });

  const hashtags = Array.isArray(parsed.hashtags)
    ? parsed.hashtags.filter((tag): tag is string => typeof tag === 'string')
    : DEFAULT_HASHTAGS;

  return {
    tweets,
    hashtags: hashtags.length > 0 ? hashtags : DEFAULT_HASHTAGS,
  };
}
