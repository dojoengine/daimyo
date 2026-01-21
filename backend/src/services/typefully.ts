import { config } from '../utils/config.js';
import { ThreadDraft, PublishResult } from '../types.js';

const TYPEFULLY_API_BASE = 'https://api.typefully.com/v2';

interface TypefullyPost {
  text: string;
}

interface TypefullyDraftRequest {
  platforms: {
    x: {
      enabled: boolean;
      posts: TypefullyPost[];
    };
  };
}

interface TypefullyDraftResponse {
  id: string;
  created_at: string;
}

/**
 * Create a draft in Typefully using v2 API
 */
export async function createDraft(draft: ThreadDraft): Promise<PublishResult> {
  if (!config.typefullyApiKey) {
    return {
      success: false,
      error: 'Typefully API key not configured',
    };
  }

  console.log(`📤 Creating Typefully draft for: "${draft.story.title}"`);

  try {
    // Convert tweets to Typefully posts format
    const posts: TypefullyPost[] = draft.content.tweets.map((tweet) => ({
      text: tweet,
    }));

    const requestBody: TypefullyDraftRequest = {
      platforms: {
        x: {
          enabled: true,
          posts,
        },
      },
    };

    const response = await fetch(
      `${TYPEFULLY_API_BASE}/social-sets/${config.typefullySocialSetId}/drafts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.typefullyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Typefully API error: ${response.status} - ${errorText}`,
      };
    }

    const data = (await response.json()) as TypefullyDraftResponse;
    console.log(`✅ Draft created in Typefully: ${data.id}`);

    return {
      success: true,
      draftId: data.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Error creating Typefully draft:', error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Create multiple drafts, handling rate limits
 */
export async function createDrafts(drafts: ThreadDraft[]): Promise<PublishResult[]> {
  const results: PublishResult[] = [];

  for (const draft of drafts) {
    const result = await createDraft(draft);
    results.push(result);

    // Small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Check if Typefully is properly configured
 */
export function isTypefullyConfigured(): boolean {
  return Boolean(config.typefullyApiKey);
}
