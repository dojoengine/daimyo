# Content Pipeline

Automated Discord-to-Twitter content generation for Dojo community stories.

## Overview

The Content Pipeline is a weekly job that scans Discord messages, identifies interesting stories about developers building with Dojo, and generates Twitter thread drafts.
Drafts are sent to Typefully for human review before publishing.

The pipeline is stateless - Typefully is the source of truth for all drafts.

## How It Works

```
Discord Messages (past 7 days)
    ↓
AI Story Identification (3-10 stories)
    ↓
AI Thread Generation (per story)
    ↓
Typefully Drafts (for review)
```

### 1. Discord Scanning

The pipeline scans all text channels in the guild for messages from the past week.
Messages are filtered to include only substantive content (>50 characters, non-bot authors).

### 2. Story Identification

An AI model analyzes the messages to identify 3-10 interesting stories.
A "story" is defined as:
- Highlights interesting Dojo functionality
- Shows a developer using Dojo creatively
- Demonstrates solving a hard technical or creative problem

Each story includes:
- Title and summary
- Source messages (with URLs for attribution)
- Relevance/confidence score (must be ≥0.6 to proceed)

### 3. Thread Generation

For each identified story, the AI generates a Twitter thread (3-7 tweets).
Threads are crafted to:
- Tell a compelling narrative
- Stay within Twitter character limits
- Include relevant hashtags
- Credit the original Discord author

### 4. Image Generation (Optional)

If an OpenAI API key is configured, each thread gets a DALL-E generated image as a visual hook.
If not configured, threads proceed without images.

### 5. Typefully Integration

Thread drafts (text + images) are sent to Typefully via their API v2.
Drafts appear in the Typefully dashboard for human review before publishing.

## Configuration

### Environment Variables

```bash
# How many days back to scan
CONTENT_PIPELINE_DAYS_BACK=7

# Story count targets
CONTENT_PIPELINE_MIN_STORIES=3
CONTENT_PIPELINE_MAX_STORIES=10

# Cron schedule (default: Sunday 9am UTC)
CONTENT_PIPELINE_CRON=0 9 * * 0

# AI (uses Claude Sonnet 4 via Anthropic)
LLM_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=sk-ant-...

# Typefully
TYPEFULLY_API_KEY=...
```

## Manual Execution

The pipeline can be run manually via npm scripts:

```bash
# Dry run - outputs drafts to terminal, no side effects
pnpm test-content-pipeline

# Actually upload to Typefully
pnpm test-content-pipeline --upload
```

Or via Railway:

```bash
railway run pnpm --filter backend test-content-pipeline
railway run pnpm --filter backend test-content-pipeline --upload
```

### Dry Run Output

In dry run mode, drafts are printed to the terminal:

```
============================================================
📝 DRAFT: Building a Chess Engine with Dojo
============================================================

[Tweet 1]
🎮 A developer just built a fully on-chain chess engine using @dojoengine

Here's how they solved the challenge of gas-efficient move validation 🧵

[Tweet 2]
The key insight: instead of validating every possible move on-chain...

Hashtags: #Dojo #Blockchain #GameDev

============================================================
```

## Typical Output

### Example Story Identification

```
📝 Starting content pipeline...
📨 Scanning 5 channels for messages...
✅ Found 1,247 messages from the past 7 days
🔍 Analyzing messages for interesting stories...
✅ Identified 6 story candidates

📚 Processing 6 stories:

  1. "Building a Chess Engine with Dojo" (confidence: 0.92)
  2. "Real-time Multiplayer with Torii" (confidence: 0.88)
  3. "NFT Crafting System Architecture" (confidence: 0.85)
...

✅ Content pipeline complete!
   Messages scanned: 1247
   Stories identified: 6
   Drafts created: 6
   Drafts failed: 0
```

## Error Handling

The pipeline is designed to be resilient:

- **Per-story isolation**: If one story fails to generate, others continue
- **Image fallback**: If image generation is not configured or fails, threads proceed without images
- **Console logging**: All progress and errors are logged to stdout

## Future Enhancements

Potential improvements for future iterations:

- **Feedback loop**: Learn from which drafts get published vs edited
- **Topic filtering**: Focus on specific channels or topics
- **Preview channel**: Post drafts to a Discord channel before Typefully
- **Analytics**: Track engagement of published threads
- **Multi-account**: Support multiple Twitter accounts via Typefully social sets
