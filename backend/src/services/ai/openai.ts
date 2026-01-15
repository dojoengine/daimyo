import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { AIProvider } from './types.js';
import { DiscordMessage, Story, ThreadContent, GeneratedImage } from '../../types.js';
import { config } from '../../utils/config.js';

/**
 * OpenAI implementation of the AI provider interface
 */
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string = config.openaiApiKey, model: string = config.llmModel) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * Analyze Discord messages to identify interesting stories about Dojo
   */
  async identifyStories(messages: DiscordMessage[], maxStories: number): Promise<Story[]> {
    if (messages.length === 0) {
      return [];
    }

    console.log(`🔍 Analyzing ${messages.length} messages for interesting stories...`);

    // Format messages for the prompt
    const formattedMessages = messages
      .slice(0, 500) // Limit to avoid token limits
      .map((m) => `[${m.authorName} in #${m.channelName}]: ${m.content}`)
      .join('\n\n');

    const systemPrompt = `You are an expert content curator for the Dojo community (an onchain game engine).
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

    const userPrompt = `Analyze these Discord messages and identify up to ${maxStories} interesting stories about developers using Dojo:

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

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn('Empty response from OpenAI');
        return [];
      }

      const parsed = JSON.parse(content);
      const rawStories = Array.isArray(parsed) ? parsed : parsed.stories || [];

      if (!Array.isArray(rawStories)) {
        console.warn('Unexpected response format from OpenAI');
        return [];
      }

      // Transform raw stories to our Story type with runtime validation
      const stories: Story[] = rawStories
        .filter((raw: unknown) => {
          // Validate required fields exist and have correct types
          if (!raw || typeof raw !== 'object') return false;
          const r = raw as Record<string, unknown>;
          return (
            typeof r.title === 'string' &&
            typeof r.summary === 'string' &&
            Array.isArray(r.messageIds) &&
            typeof r.confidence === 'number' &&
            typeof r.imagePrompt === 'string'
          );
        })
        .map(
          (raw: {
            title: string;
            summary: string;
            messageIds: string[];
            confidence: number;
            imagePrompt: string;
          }) => ({
            id: randomUUID(),
            title: raw.title,
            summary: raw.summary,
            sourceMessages: messages.filter((m) => raw.messageIds.includes(m.id)),
            confidence: raw.confidence,
            suggestedImagePrompt: raw.imagePrompt,
          })
        );

      console.log(`✅ Identified ${stories.length} story candidates`);
      return stories.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error identifying stories:', error);
      throw error;
    }
  }

  /**
   * Generate a Twitter thread from an identified story
   */
  async generateThread(story: Story): Promise<ThreadContent> {
    console.log(`📝 Generating thread for: "${story.title}"`);

    const sourceContent = story.sourceMessages
      .map((m) => `${m.authorName}: ${m.content}`)
      .join('\n\n');

    const systemPrompt = `You are an expert Twitter thread writer for the Dojo community (an onchain game engine).
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

    const userPrompt = `Write a Twitter thread about this story:

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

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);

      // Validate tweet lengths
      const tweets = (parsed.tweets || []).map((tweet: string) => {
        if (tweet.length > 280) {
          console.warn(`Tweet exceeds 280 chars, truncating: ${tweet.substring(0, 50)}...`);
          return tweet.substring(0, 277) + '...';
        }
        return tweet;
      });

      console.log(`✅ Generated ${tweets.length} tweets for thread`);
      return {
        tweets,
        hashtags: parsed.hashtags || ['#Dojo', '#GameDev'],
      };
    } catch (error) {
      console.error('Error generating thread:', error);
      throw error;
    }
  }

  /**
   * Generate an image using DALL-E
   */
  async generateImage(prompt: string): Promise<GeneratedImage> {
    console.log(`🎨 Generating image for prompt: "${prompt.substring(0, 50)}..."`);

    // Enhance the prompt for better social media visuals
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

/**
 * Create the default AI provider based on configuration
 */
export function createAIProvider(): AIProvider {
  if (config.llmProvider === 'anthropic') {
    // TODO: Implement Anthropic provider
    throw new Error('Anthropic provider not yet implemented. Use OpenAI for now.');
  }

  return new OpenAIProvider();
}
