import cron from 'node-cron';
import { Client } from 'discord.js';
import { config } from '../utils/config.js';
import { scanChannelsForMessages } from '../services/discordScanner.js';
import { createAIProvider } from '../services/ai/openai.js';
import { createDraft, isTypefullyConfigured } from '../services/typefully.js';
import {
  startPipelineRun,
  completePipelineRun,
  insertStory,
  insertDraft,
  updateDraftStatus,
  storyExists,
} from '../services/database.js';
import { ThreadDraft, GeneratedImage } from '../types.js';

/**
 * Run the content pipeline
 *
 * 1. Scan Discord channels for recent messages
 * 2. Use AI to identify interesting stories
 * 3. Generate Twitter threads for each story
 * 4. Generate images for visual hooks
 * 5. Submit drafts to Typefully for review
 */
async function runContentPipeline(client: Client): Promise<void> {
  console.log('📝 Starting content pipeline...');

  // Validate configuration
  if (config.contentChannelIds.length === 0) {
    console.warn(
      '⚠️ No content channels configured. Set CONTENT_CHANNEL_IDS to enable content pipeline.'
    );
    return;
  }

  if (!config.openaiApiKey && config.llmProvider === 'openai') {
    console.warn(
      '⚠️ OpenAI API key not configured. Set OPENAI_API_KEY to enable content pipeline.'
    );
    return;
  }

  if (!isTypefullyConfigured()) {
    console.warn(
      '⚠️ Typefully API key not configured. Set TYPEFULLY_API_KEY to enable draft publishing.'
    );
  }

  // Start tracking this run
  const runId = await startPipelineRun();
  let messagesScanned = 0;
  let storiesIdentified = 0;
  let draftsCreated = 0;
  let draftsFailed = 0;

  try {
    // Step 1: Scan Discord messages
    const messages = await scanChannelsForMessages(client, config.contentPipelineDaysBack);
    messagesScanned = messages.length;

    if (messages.length === 0) {
      console.log('No messages found to process');
      await completePipelineRun(runId, {
        messagesScanned,
        storiesIdentified,
        draftsCreated,
        draftsFailed,
      });
      return;
    }

    // Step 2: Identify stories using AI
    const aiProvider = createAIProvider();
    const stories = await aiProvider.identifyStories(messages, config.contentPipelineMaxStories);
    storiesIdentified = stories.length;

    if (stories.length === 0) {
      console.log('No interesting stories identified');
      await completePipelineRun(runId, {
        messagesScanned,
        storiesIdentified,
        draftsCreated,
        draftsFailed,
      });
      return;
    }

    // Filter to minimum confidence and check for duplicates
    const filteredStories = [];
    for (const story of stories) {
      if (story.confidence < 0.6) {
        continue;
      }

      // Check for duplicate stories
      const messageIds = story.sourceMessages.map((m) => m.id);
      if (await storyExists(messageIds)) {
        console.log(`Skipping duplicate story: "${story.title}"`);
        continue;
      }

      filteredStories.push(story);
    }

    // Limit to configured maximum
    const storiesToProcess = filteredStories.slice(0, config.contentPipelineMaxStories);

    if (storiesToProcess.length < config.contentPipelineMinStories) {
      console.warn(
        `Only found ${storiesToProcess.length} stories (minimum: ${config.contentPipelineMinStories})`
      );
    }

    console.log(`\n📚 Processing ${storiesToProcess.length} stories:\n`);
    storiesToProcess.forEach((s, i) => {
      console.log(`  ${i + 1}. "${s.title}" (confidence: ${s.confidence.toFixed(2)})`);
    });
    console.log('');

    // Step 3-5: For each story, generate thread + image + publish
    for (const story of storiesToProcess) {
      try {
        console.log(`\n🔄 Processing: "${story.title}"`);

        // Generate thread content
        const threadContent = await aiProvider.generateThread(story);

        // Generate image (with fallback on failure)
        let image: GeneratedImage;
        try {
          image = await aiProvider.generateImage(story.suggestedImagePrompt);
        } catch (imageError) {
          console.warn(`⚠️ Image generation failed, continuing without image:`, imageError);
          image = { url: '', prompt: story.suggestedImagePrompt };
        }

        // Create draft object
        const draft: ThreadDraft = {
          story,
          content: threadContent,
          image,
          createdAt: Date.now(),
        };

        // Save story and draft to database together (prevents orphans)
        await insertStory(story);
        const draftId = await insertDraft(story.id, draft, 'pending');

        // Submit to Typefully if configured
        if (isTypefullyConfigured()) {
          const result = await createDraft(draft);

          if (result.success) {
            await updateDraftStatus(draftId, 'submitted', result.draftId);
            draftsCreated++;
            console.log(`✅ Draft submitted to Typefully: ${result.draftId}`);
          } else {
            await updateDraftStatus(draftId, 'failed');
            draftsFailed++;
            console.warn(`⚠️ Failed to submit draft: ${result.error}`);
          }
        } else {
          // No Typefully, just mark as pending
          draftsCreated++;
          console.log('✅ Draft saved (Typefully not configured)');
        }
      } catch (error) {
        draftsFailed++;
        console.error(`❌ Error processing story "${story.title}":`, error);
      }
    }

    // Complete the run
    await completePipelineRun(runId, {
      messagesScanned,
      storiesIdentified,
      draftsCreated,
      draftsFailed,
    });

    console.log(`
✅ Content pipeline complete!
   Messages scanned: ${messagesScanned}
   Stories identified: ${storiesIdentified}
   Drafts created: ${draftsCreated}
   Drafts failed: ${draftsFailed}
`);
  } catch (error) {
    console.error('Error during content pipeline:', error);

    await completePipelineRun(runId, {
      messagesScanned,
      storiesIdentified,
      draftsCreated,
      draftsFailed,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Schedule and start the content pipeline cron job
 * Default: Runs weekly on Sunday at 09:00 UTC
 */
export function startContentPipelineJob(client: Client): void {
  const cronSchedule = config.contentPipelineCron;
  console.log(`⏰ Scheduling content pipeline: ${cronSchedule}`);

  cron.schedule(cronSchedule, () => {
    runContentPipeline(client);
  });

  console.log('✅ Content pipeline job scheduled');
}

/**
 * Run content pipeline immediately (for testing)
 */
export async function runContentPipelineNow(client: Client): Promise<void> {
  console.log('Running content pipeline immediately (manual trigger)...');
  await runContentPipeline(client);
}
