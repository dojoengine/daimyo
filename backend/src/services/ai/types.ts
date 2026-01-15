import { DiscordMessage, Story, ThreadContent, GeneratedImage } from '../../types.js';

/**
 * Interface for LLM providers that identify stories from Discord messages
 */
export interface StoryIdentifier {
  /**
   * Analyze Discord messages and identify interesting stories
   * @param messages Array of Discord messages to analyze
   * @param maxStories Maximum number of stories to return
   * @returns Array of identified stories sorted by confidence
   */
  identifyStories(messages: DiscordMessage[], maxStories: number): Promise<Story[]>;
}

/**
 * Interface for LLM providers that generate Twitter thread content
 */
export interface ContentGenerator {
  /**
   * Generate a Twitter thread from an identified story
   * @param story The story to generate content for
   * @returns Thread content with tweets and hashtags
   */
  generateThread(story: Story): Promise<ThreadContent>;
}

/**
 * Interface for image generation providers
 */
export interface ImageGenerator {
  /**
   * Generate an image from a prompt
   * @param prompt The image generation prompt
   * @returns Generated image with URL
   */
  generateImage(prompt: string): Promise<GeneratedImage>;
}

/**
 * Combined AI provider interface for content pipeline
 */
export interface AIProvider extends StoryIdentifier, ContentGenerator, ImageGenerator {}
