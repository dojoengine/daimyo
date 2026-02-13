import OpenAI from 'openai';
import { AIProvider } from './types.js';
import { DiscordMessage, Story, ThreadContent, GeneratedImage } from '../../types.js';
import { config } from '../../utils/config.js';
import {
  formatMessagesForStoryPrompt,
  buildStoryIdentificationPrompt,
  normalizeStoriesFromModel,
  buildThreadGenerationPrompt,
  normalizeThreadContent,
} from './common.js';

/**
 * OpenAI implementation of the AI provider interface.
 */
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string = config.openaiApiKey, model: string = config.llmModel) {
    this.client = new OpenAI({ apiKey });
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
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: prompts.system },
          { role: 'user', content: prompts.user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn('Empty response from OpenAI');
        return [];
      }

      const parsed = JSON.parse(content) as unknown;
      const rawStories = Array.isArray(parsed)
        ? parsed
        : (parsed as { stories?: unknown[] })?.stories || [];

      if (!Array.isArray(rawStories)) {
        console.warn('Unexpected response format from OpenAI');
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
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: prompts.system },
          { role: 'user', content: prompts.user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content) as Record<string, unknown>;
      const thread = normalizeThreadContent(parsed);

      console.log(`✅ Generated ${thread.tweets.length} tweets for thread`);
      return thread;
    } catch (error) {
      console.error('Error generating thread:', error);
      throw error;
    }
  }

  /**
   * Generate an image using DALL-E.
   */
  async generateImage(prompt: string): Promise<GeneratedImage> {
    console.log(`🎨 Generating image for prompt: "${prompt.substring(0, 50)}..."`);

    const enhancedPrompt = `Create a visually striking, modern illustration for social media. Style: clean, vibrant, professional. Theme: ${prompt}. No text in the image. Suitable for a tech/gaming audience.`;

    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL in response');
      }

      console.log('✅ Image generated successfully');
      return {
        url: imageUrl,
        prompt: enhancedPrompt,
      };
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }
}
