import { config } from '../utils/config.js';
import { ThreadDraft, PublishResult } from '../types.js';

const TYPEFULLY_API_BASE = 'https://api.typefully.com/v2';

interface TypefullyDraftRequest {
  content: string;
  threadify?: boolean;
  schedule_date?: string;
  auto_plug?: boolean;
}

interface TypefullyDraftResponse {
  id: string;
  content: string;
  created_at: string;
  scheduled_date?: string;
}

interface TypefullyMediaResponse {
  id: string;
  url: string;
}

/**
 * Upload an image to Typefully for use in a draft
 */
export async function uploadImage(imageUrl: string): Promise<string | null> {
  if (!config.typefullyApiKey) {
    console.warn('Typefully API key not configured');
    return null;
  }

  try {
    // First, fetch the image from the URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBlob = await imageResponse.blob();

    // Create form data for upload
    const formData = new FormData();
    formData.append('file', imageBlob, 'image.png');

    const response = await fetch(`${TYPEFULLY_API_BASE}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.typefullyApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Typefully media upload failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as TypefullyMediaResponse;
    console.log(`✅ Image uploaded to Typefully: ${data.id}`);
    return data.id;
  } catch (error) {
    console.warn('Error uploading image to Typefully:', error);
    return null;
  }
}

/**
 * Format tweets into Typefully's thread format
 * Typefully uses "----" as the thread separator
 */
function formatThreadContent(tweets: string[], mediaId?: string): string {
  // Add media reference to the first tweet if available
  let content = tweets.join('\n----\n');

  // If we have a media ID, append it to the first tweet section
  if (mediaId) {
    const parts = content.split('\n----\n');
    parts[0] = `${parts[0]}\n\n[media:${mediaId}]`;
    content = parts.join('\n----\n');
  }

  return content;
}

/**
 * Create a draft in Typefully
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
    // Upload image first if available
    let mediaId: string | null = null;
    if (draft.image?.url) {
      mediaId = await uploadImage(draft.image.url);
    }

    // Format the thread content
    const content = formatThreadContent(draft.content.tweets, mediaId || undefined);

    const requestBody: TypefullyDraftRequest = {
      content,
      threadify: true, // Let Typefully handle thread splitting
      auto_plug: false, // Don't auto-add promotional content
    };

    const response = await fetch(`${TYPEFULLY_API_BASE}/drafts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.typefullyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

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
