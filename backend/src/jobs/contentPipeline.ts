import cron from 'node-cron';
import { Client } from 'discord.js';
import { config } from '../utils/config.js';
import { scanChannelsForMessages, scanAllChannels } from '../services/discordScanner.js';
import { createAIProvider } from '../services/ai/openai.js';
import { createDraft, isTypefullyConfigured } from '../services/typefully.js';
import { ThreadDraft, GeneratedImage } from '../types.js';

/**
 * Run the content pipeline
 *
 * 1. Scan Discord channels for recent messages
 * 2. Use AI to identify interesting stories
 * 3. Generate Twitter threads for each story
 * 4. Generate images for visual hooks
 * 5. Submit drafts to Typefully for review (unless dryRun=true)
 */
async function runContentPipeline(client: Client, dryRun = false): Promise<void> {
  console.log('📝 Starting content pipeline...');

  // Validate configuration
  if (!config.anthropicApiKey) {
    console.warn(
      '⚠️ Anthropic API key not configured. Set ANTHROPIC_API_KEY to enable content pipeline.'
    );
    return;
  }

  if (!dryRun && !isTypefullyConfigured()) {
    console.warn(
      '⚠️ Typefully API key not configured. Set TYPEFULLY_API_KEY to enable draft publishing.'
    );
    return;
  }

  let messagesScanned = 0;
  let storiesIdentified = 0;
  let draftsCreated = 0;
  let draftsFailed = 0;

  try {
    // Step 1: Scan Discord messages
    // If no specific channels configured, scan all text channels
    const messages =
      config.contentChannelIds.length === 0
        ? await scanAllChannels(client, config.contentPipelineDaysBack)
        : await scanChannelsForMessages(client, config.contentPipelineDaysBack);
    messagesScanned = messages.length;

    if (messages.length === 0) {
      console.log('No messages found to process');
      return;
    }

    // Step 2: Identify stories using AI
    const aiProvider = await createAIProvider();
    const stories = await aiProvider.identifyStories(messages, config.contentPipelineMaxStories);
    storiesIdentified = stories.length;

    if (stories.length === 0) {
      console.log('No interesting stories identified');
      return;
    }

    // Filter to minimum confidence
    const filteredStories = stories.filter((story) => story.confidence >= 0.6);

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

        // In dry run mode, output to console instead of uploading
        if (dryRun) {
          console.log('\n' + '='.repeat(60));
          console.log(`📝 DRAFT: ${story.title}`);
          console.log('='.repeat(60));
          draft.content.tweets.forEach((tweet, i) => {
            console.log(`\n[Tweet ${i + 1}]`);
            console.log(tweet);
          });
          if (draft.content.hashtags.length > 0) {
            console.log(`\nHashtags: ${draft.content.hashtags.join(' ')}`);
          }
          if (draft.image?.url) {
            console.log(`\nImage URL: ${draft.image.url}`);
          }
          console.log('\n' + '='.repeat(60) + '\n');
          draftsCreated++;
        } else {
          // Submit to Typefully
          const result = await createDraft(draft);

          if (result.success) {
            draftsCreated++;
            console.log(`✅ Draft submitted to Typefully: ${result.draftId}`);
          } else {
            draftsFailed++;
            console.warn(`⚠️ Failed to submit draft: ${result.error}`);
          }
        }
      } catch (error) {
        draftsFailed++;
        console.error(`❌ Error processing story "${story.title}":`, error);
      }
    }

    console.log(`
✅ Content pipeline complete!
   Messages scanned: ${messagesScanned}
   Stories identified: ${storiesIdentified}
   Drafts created: ${draftsCreated}
   Drafts failed: ${draftsFailed}
`);
  } catch (error) {
    console.error('Error during content pipeline:', error);
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
 * @param dryRun If true, outputs drafts to console instead of uploading to Typefully
 */
export async function runContentPipelineNow(client: Client, dryRun = false): Promise<void> {
  console.log(`Running content pipeline immediately (manual trigger, dryRun=${dryRun})...`);
  await runContentPipeline(client, dryRun);
}
