import Anthropic from '@anthropic-ai/sdk';
import { AIProvider } from './types.js';
import { DiscordMessage, Story, ThreadContent, GeneratedImage } from '../../types.js';
import { config } from '../../utils/config.js';
import {
  extractJsonArray,
  extractJsonObject,
  formatMessagesForStoryPrompt,
  buildThreadGenerationPrompt,
  buildStoryIdentificationPrompt,
  normalizeStoriesFromModel,
  normalizeThreadContent,
} from './common.js';

/**
 * Anthropic implementation of the AI provider interface.
 */
export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string = config.anthropicApiKey, model: string = config.llmModel) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  /**
   * Analyze Discord messages to identify interesting stories about Dojo.
   */
  async identifyStories(messages: DiscordMessage[], maxStories: number): Promise<Story[]> {
    if (messages.length === 0) {
      return [];
    }

    console.log(`🔍 Analyzing ${messages.length} messages for interesting stories...`);

    const formattedMessages = formatMessagesForStoryPrompt(messages);
    const prompts = buildStoryIdentificationPrompt(formattedMessages, maxStories);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: prompts.system,
        messages: [{ role: 'user', content: prompts.user }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const content = textBlock?.type === 'text' ? textBlock.text : '';

      if (!content) {
        console.warn('Empty response from Anthropic');
        return [];
      }

      const jsonArray = extractJsonArray(content);
      if (!jsonArray) {
        console.warn('No JSON array found in response');
        return [];
      }

      const rawStories = JSON.parse(jsonArray) as unknown;
      if (!Array.isArray(rawStories)) {
        console.warn('Unexpected response format from Anthropic');
        return [];
      }

      const stories = normalizeStoriesFromModel(rawStories, messages);
      console.log(`✅ Identified ${stories.length} story candidates`);
      return stories;
    } catch (error) {
      console.error('Error identifying stories:', error);
      throw error;
    }
  }

  /**
   * Generate a Twitter thread from an identified story.
   */
  async generateThread(story: Story): Promise<ThreadContent> {
    console.log(`📝 Generating thread for: "${story.title}"`);

    const prompts = buildThreadGenerationPrompt(story);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: prompts.system,
        messages: [{ role: 'user', content: prompts.user }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const content = textBlock?.type === 'text' ? textBlock.text : '';

      if (!content) {
        throw new Error('Empty response from Anthropic');
      }

      const jsonObject = extractJsonObject(content);
      if (!jsonObject) {
        throw new Error('No JSON object found in response');
      }

      const parsed = JSON.parse(jsonObject) as Record<string, unknown>;
      const thread = normalizeThreadContent(parsed);

      console.log(`✅ Generated ${thread.tweets.length} tweets for thread`);
      return thread;
    } catch (error) {
      console.error('Error generating thread:', error);
      throw error;
    }
  }

  /**
   * Generate an image - Anthropic doesn't have image generation,
   * so we fall back to OpenAI's DALL-E if available.
   */
  async generateImage(prompt: string): Promise<GeneratedImage> {
    if (config.openaiApiKey && config.openaiApiKey !== 'sk-your-openai-key') {
      const { OpenAIProvider } = await import('./openai.js');
      const openaiProvider = new OpenAIProvider();
      return openaiProvider.generateImage(prompt);
    }

    console.warn('⚠️ No image generation available (OpenAI API key not configured)');
    return {
      url: '',
      prompt,
    };
  }
}
