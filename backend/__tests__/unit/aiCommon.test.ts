import { describe, test, expect } from '@jest/globals';
import {
  normalizeStoriesFromModel,
  extractJsonArray,
  extractJsonObject,
  normalizeThreadContent,
} from '../../src/services/ai/common.js';

describe('ai common utilities', () => {
  test('normalizeStoriesFromModel filters invalid stories and sorts by confidence descending', () => {
    const messages = [
      {
        id: 'm1',
        authorId: 'u1',
        authorName: 'alice',
        content: 'Built a new feature',
        timestamp: 1,
        channelId: 'c1',
        channelName: 'dev',
        url: 'https://discord.com/channels/1/1/1',
      },
      {
        id: 'm2',
        authorId: 'u2',
        authorName: 'bob',
        content: 'Solved sync issue',
        timestamp: 2,
        channelId: 'c1',
        channelName: 'dev',
        url: 'https://discord.com/channels/1/1/2',
      },
    ];

    const rawStories = [
      {
        title: 'Story B',
        summary: 'Second story',
        messageIds: ['m2'],
        confidence: 0.7,
        imagePrompt: 'A robot coding',
      },
      {
        title: 'Story A',
        summary: 'Top story',
        messageIds: ['m1'],
        confidence: 0.9,
        imagePrompt: 'A samurai coding',
      },
      {
        // invalid and should be filtered
        title: 'Invalid Story',
        confidence: 'high',
      },
    ] as unknown[];

    const stories = normalizeStoriesFromModel(rawStories, messages);

    expect(stories).toHaveLength(2);
    expect(stories[0].title).toBe('Story A');
    expect(stories[1].title).toBe('Story B');
    expect(stories[0].sourceMessages.map((m) => m.id)).toEqual(['m1']);
  });

  test('extractJsonArray and extractJsonObject find JSON payloads in text responses', () => {
    const textWithArray = 'Result:\n```json\n[{"title":"x"}]\n```';
    const textWithObject = 'Result:\n```json\n{"tweets":["a"]}\n```';

    expect(extractJsonArray(textWithArray)).toBe('[{"title":"x"}]');
    expect(extractJsonObject(textWithObject)).toBe('{"tweets":["a"]}');
  });

  test('normalizeThreadContent truncates long tweets and applies default hashtags', () => {
    const longTweet = 'x'.repeat(400);
    const result = normalizeThreadContent({
      tweets: [longTweet, 'short tweet'],
      hashtags: [],
    });

    expect(result.tweets[0]).toHaveLength(280);
    expect(result.tweets[0].endsWith('...')).toBe(true);
    expect(result.tweets[1]).toBe('short tweet');
    expect(result.hashtags).toEqual(['#Dojo', '#GameDev']);
  });
});
