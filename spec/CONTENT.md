# Content Pipeline

Automated Discord-to-Twitter content generation for Dojo community stories.

## Overview

The Content Pipeline is a weekly job that scans Discord messages, identifies interesting stories about developers building with Dojo, and generates Twitter thread drafts with AI-generated images.
Drafts are sent to Typefully for human review before publishing.

## How It Works

```
Discord Messages (past 7 days)
    ↓
AI Story Identification (3-10 stories)
    ↓
AI Thread Generation (per story)
    ↓
AI Image Generation (visual hooks)
    ↓
Typefully Drafts (for review)
```

### 1. Discord Scanning

The pipeline scans configured Discord channels for messages from the past week.
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
- Relevance/confidence score

### 3. Thread Generation

For each identified story, the AI generates a Twitter thread (3-7 tweets).
Threads are crafted to:
- Tell a compelling narrative
- Stay within Twitter character limits
- Include relevant hashtags
- Credit the original Discord author

### 4. Image Generation

Each thread gets an AI-generated image as a visual hook.
Images are stylized representations designed to catch attention on social media feeds.

### 5. Typefully Integration

Thread drafts (text + images) are sent to Typefully via their API v2.
Drafts appear in the Typefully dashboard for human review before publishing.

## Configuration

### Environment Variables

```bash
# Discord channels to scan (comma-separated IDs)
CONTENT_CHANNEL_IDS=123456789,987654321

# How many days back to scan
CONTENT_PIPELINE_DAYS_BACK=7

# Story count targets
CONTENT_PIPELINE_MIN_STORIES=3
CONTENT_PIPELINE_MAX_STORIES=10

# Cron schedule (default: Sunday 9am UTC)
CONTENT_PIPELINE_CRON=0 9 * * 0

# AI Provider selection
LLM_PROVIDER=openai          # openai | anthropic
LLM_MODEL=gpt-4o             # model name
IMAGE_PROVIDER=dalle         # dalle | replicate

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-... # if using anthropic
REPLICATE_API_KEY=r8_...     # if using replicate

# Typefully
TYPEFULLY_API_KEY=...
```

### Finding Channel IDs

1. Enable Developer Mode in Discord (Settings → App Settings → Advanced → Developer Mode)
2. Right-click on any channel → Copy Channel ID

## AI Providers

The pipeline uses swappable AI providers for flexibility.

### LLM Providers

**OpenAI** (default):
- Used for story identification and thread generation
- Recommended model: `gpt-4o` for best quality
- Set `LLM_PROVIDER=openai`

**Anthropic** (alternative):
- Set `LLM_PROVIDER=anthropic`
- Requires `ANTHROPIC_API_KEY`

### Image Providers

**DALL-E** (default):
- OpenAI's image generation
- Set `IMAGE_PROVIDER=dalle`
- Uses same `OPENAI_API_KEY`

**Replicate** (alternative):
- Access to various models (Stable Diffusion, Flux, etc.)
- Set `IMAGE_PROVIDER=replicate`
- Requires `REPLICATE_API_KEY`

## Database Schema

The pipeline stores data in the existing SQLite database.

### content_stories

Tracks identified stories for audit and deduplication.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| title | TEXT | Story title |
| summary | TEXT | Brief summary |
| source_message_ids | TEXT | JSON array of Discord message IDs |
| source_channel_id | TEXT | Primary channel ID |
| confidence | REAL | AI confidence score (0-1) |
| created_at | INTEGER | Unix timestamp |

### content_drafts

Tracks generated drafts and their status.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| story_id | TEXT | Foreign key to content_stories |
| tweets | TEXT | JSON array of tweet strings |
| image_prompt | TEXT | Prompt used for image generation |
| image_url | TEXT | Generated image URL |
| typefully_draft_id | TEXT | Typefully draft ID (after submission) |
| status | TEXT | pending, submitted, failed |
| created_at | INTEGER | Unix timestamp |

### content_pipeline_runs

Tracks pipeline execution history.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| started_at | INTEGER | Unix timestamp |
| completed_at | INTEGER | Unix timestamp |
| messages_scanned | INTEGER | Total messages processed |
| stories_identified | INTEGER | Stories found |
| drafts_created | INTEGER | Successful drafts |
| drafts_failed | INTEGER | Failed drafts |
| error | TEXT | Error message if failed |

## Manual Trigger

The pipeline can be triggered manually for testing:

```typescript
import { runContentPipelineNow } from './jobs/contentPipeline.js';

// In your test or REPL
await runContentPipelineNow(client);
```

## Typical Output

### Example Story Identification

```
📝 Starting weekly content pipeline...
📨 Scanning 5 channels for messages...
✅ Found 1,247 messages from the past 7 days
🔍 Analyzing messages for interesting stories...
✅ Identified 6 story candidates

Stories:
1. "Building a Chess Engine with Dojo" (confidence: 0.92)
2. "Real-time Multiplayer with Torii" (confidence: 0.88)
3. "NFT Crafting System Architecture" (confidence: 0.85)
...
```

### Example Thread Output

```
Thread 1/6: "Building a Chess Engine with Dojo"

Tweet 1:
🎮 A developer just built a fully on-chain chess engine using @doaboradojo

Here's how they solved the challenge of gas-efficient move validation 🧵

Tweet 2:
The key insight: instead of validating every possible move on-chain, they pre-compute legal moves off-chain and use Merkle proofs for verification.

Tweet 3:
This reduced gas costs by 90% while maintaining trustless gameplay.

Source: discord.com/channels/...

#Dojo #Blockchain #GameDev

[Image: AI-generated chess-themed illustration]
```

## Error Handling

The pipeline is designed to be resilient:

- **Per-story isolation**: If one story fails to generate, others continue
- **Database logging**: All runs are logged for debugging
- **Status tracking**: Each draft tracks its submission status
- **Manual retry**: Failed drafts can be retried by updating status to 'pending'

## Future Enhancements

Potential improvements for future iterations:

- **Feedback loop**: Learn from which drafts get published vs edited
- **Topic filtering**: Focus on specific channels or topics
- **Deduplication**: Avoid similar stories across weeks
- **Preview channel**: Post drafts to a Discord channel before Typefully
- **Analytics**: Track engagement of published threads
- **Multi-account**: Support multiple Twitter accounts via Typefully social sets
