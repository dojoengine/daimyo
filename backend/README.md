# Daimyō Backend

Discord reputation bot for the Dojo community.

Implements a reputation system where users earn roles (Kōhai → Senpai → Sensei) based on :dojo: reactions from peers.

## Features

- **Reaction-Based Reputation**: Track :dojo: emoji reactions with role-weighted significance
- **Automatic Promotions**: Users automatically advance when meeting thresholds
- **Diversity Requirements**: Promotions require reactions from a percentage of unique users
- **Decay System**: Sensei must maintain activity within a 360-day rolling window
- **Slash Commands**: `/stats`, `/leaderboard`, `/daimyo-sync`, `/daimyo-audit`
- **Role Hierarchy**: Kōhai (default) → Senpai (50 reactions) → Sensei (30 Sensei reactions)

## Tech Stack

- **TypeScript** - Type-safe development
- **Discord.js v14** - Discord bot framework
- **PostgreSQL (postgres.js)** - Production database
- **node-cron** - Scheduled decay checks

## Setup

### Prerequisites

- Node.js 18+ and npm
- Discord bot token and application
- Discord server (guild) with administrator permissions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" tab and create a bot
4. Enable these **Privileged Gateway Intents**:
   - Server Members Intent (required)
   - Message Content Intent (optional, not currently needed)
5. Copy the bot token
6. Go to "OAuth2" tab and copy the Client ID
7. Go to "OAuth2" → "URL Generator":
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Manage Roles`, `Send Messages`, `Use Slash Commands`, `Add Reactions`
8. Use the generated URL to invite bot to your server

### 3. Discord Server Setup

1. Create three roles in your Discord server:
   - **Kōhai** (default role for all members)
   - **Senpai** (earned through peer recognition)
   - **Sensei** (highest reputation tier)
2. Upload a custom `:dojo:` emoji to your server
3. Copy the role IDs and emoji ID (enable Developer Mode in Discord settings)

### 4. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
DISCORD_CLIENT_ID=your_client_id_here

# Emoji Configuration
DOJO_EMOJI_NAME=dojo
DOJO_EMOJI_ID=optional_custom_emoji_id

# Role IDs (right-click role in Discord with Developer Mode enabled)
KOHAI_ROLE_ID=your_kohai_role_id
SENPAI_ROLE_ID=your_senpai_role_id
SENSEI_ROLE_ID=your_sensei_role_id

# Database (PostgreSQL connection URL)
DATABASE_URL=postgresql://user:password@host:5432/daimyo

# Reputation Thresholds (optional, defaults shown)
DECAY_WINDOW_DAYS=360
SENPAI_REACTION_THRESHOLD=50
SENPAI_UNIQUE_PERCENT=0.10
SENSEI_REACTION_THRESHOLD=30
SENSEI_UNIQUE_PERCENT=0.20
```

### 5. Deploy Commands

Register slash commands with Discord:

```bash
npm run deploy-commands
```

This only needs to be run once, or when command definitions change.

### 6. Run the Bot

**Development mode** (with auto-reload):

```bash
npm run dev
```

**Production mode**:

```bash
npm run build
npm start
```

The bot will:

- Connect to PostgreSQL database
- Connect to Discord
- Fetch all guild members
- Start listening for reactions
- Schedule daily decay checks (midnight UTC)

## Usage

### User Commands

#### `/stats [user]`

Display reputation statistics for yourself or another user.

Shows:

- Current role
- Total reactions by role (Kōhai, Senpai, Sensei)
- Progress to next role
- For Sensei: time-windowed decay status

#### `/leaderboard [role]`

Display top 20 users by reputation.

Optional `role` filter shows reactions from specific role only.

### Admin Commands

#### `/daimyo-sync`

Manually trigger a full sync of all roles.

Checks all members for promotions and demotions.
Useful for:

- Initial setup after importing historical data
- Fixing any role inconsistencies
- Testing promotion logic

**Requires:** Administrator permission

#### `/daimyo-audit [user]`

Display detailed audit information for a user.

Shows:

- Current reputation scores
- Role history with timestamps
- Recent reactions received
- Promotion/demotion eligibility

**Requires:** Administrator permission

## Architecture

### Directory Structure

```
backend/
├── src/
│   ├── commands/          # Slash command handlers
│   │   ├── stats.ts
│   │   ├── leaderboard.ts
│   │   ├── sync.ts
│   │   └── audit.ts
│   ├── events/            # Discord event handlers
│   │   ├── ready.ts
│   │   ├── guildMemberAdd.ts
│   │   └── messageReactionAdd.ts
│   ├── services/          # Core business logic
│   │   ├── database.ts    # PostgreSQL queries
│   │   ├── roleManager.ts # Discord role management
│   │   ├── reputation.ts  # Promotion logic
│   │   └── decay.ts       # Demotion logic
│   ├── jobs/              # Scheduled tasks
│   │   └── decayCheck.ts  # Daily cron job
│   ├── utils/             # Utilities
│   │   ├── config.ts      # Environment config
│   │   └── logger.ts      # Logging
│   ├── types.ts           # TypeScript types
│   ├── index.ts           # Entry point
│   └── deploy-commands.ts # Command registration
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Key Design Decisions

**Discord as Source of Truth**

- Current roles are stored in Discord, not the database
- Database only stores historical event data (reactions, role changes)
- Guild member cache is used for fast role lookups

**Snapshot-Based Reactions**

- Reactor role at time of reaction is preserved
- If a Sensei is demoted, their past reactions still count as Sensei reactions
- This prevents retroactive invalidation of earned reputation

**Diversity Requirements**

- Senpai: 50 reactions from ≥10% unique Senpai/Sensei
- Sensei: 30 reactions from ≥20% unique Sensei
- Uses CEIL for rounding (e.g., 5 Sensei → need 1 unique, 6 Sensei → need 2 unique)

**Time-Windowed Decay**

- Only Sensei are subject to decay
- Must maintain 30 Sensei reactions within last 360 days
- Checked daily at midnight UTC via cron job

## Database Schema

### reactions

Stores all :dojo: reactions received by users.

```sql
CREATE TABLE reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  message_author_id TEXT NOT NULL,
  reactor_id TEXT NOT NULL,
  reactor_role_at_time TEXT NOT NULL,  -- Snapshot of role at time of reaction
  timestamp INTEGER NOT NULL,
  UNIQUE(message_id, reactor_id)       -- One reaction per user per message
);
```

### role_history

Audit trail of role changes.

```sql
CREATE TABLE role_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  reason TEXT NOT NULL,  -- 'promotion', 'demotion', 'decay', 'manual'
  timestamp INTEGER NOT NULL
);
```

## Troubleshooting

### Bot doesn't come online

- Check bot token is correct
- Ensure bot has been invited to server
- Check console for error messages

### Commands don't appear

- Run `npm run deploy-commands` to register commands
- Wait a few minutes for Discord to propagate
- Check bot has `applications.commands` scope

### Reactions not being tracked

- Verify emoji name matches `DOJO_EMOJI_NAME` in `.env`
- Check bot has `GuildMessageReactions` intent enabled
- Ensure bot can see the channel where reactions occur

### Promotions not triggering

- Run `/daimyo-audit [user]` to see exact scores
- Check diversity requirements are met (not just reaction count)
- Verify role IDs are correct in `.env`
- Run `/daimyo-sync` to force a manual check

### Roles not being assigned

- Ensure bot's role is higher than reputation roles in Discord server settings
- Check bot has "Manage Roles" permission
- Verify role IDs in `.env` match actual Discord roles

## Development

### TypeScript Configuration

The project uses strict TypeScript with ES2022 modules.
Type checking runs during build.

### Logging

All operations are logged with timestamps and severity levels:

- `DEBUG`: Detailed operation info
- `INFO`: General events (promotions, reactions)
- `WARN`: Non-fatal issues
- `ERROR`: Fatal errors

### Testing

The project includes a comprehensive test suite using Jest with Discord.js mocks.

#### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-reruns on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

#### Test Structure

```
__tests__/
├── mocks/                    # Mock utilities
│   ├── discord.ts           # Discord.js object mocks
│   └── database.ts          # Test database utilities
├── unit/                     # Unit tests
│   ├── database.test.ts     # Database layer tests
│   ├── reputation.test.ts   # Reputation calculations
│   └── decay.test.ts        # Decay logic tests
└── integration/              # Integration tests
    ├── messageReaction.test.ts  # Reaction flow tests
    └── commands.test.ts     # Slash command tests
```

#### Test Coverage

The test suite covers:

- **Database Layer**: Reaction storage, UNIQUE constraints, queries, role history
- **Reputation Calculations**: Senpai/Sensei scoring, diversity requirements (CEIL logic)
- **Decay Logic**: Time windows, demotion triggers, Sensei status tracking
- **Event Handlers**: Reaction tracking, self-reaction filtering, duplicate handling
- **Commands**: Stats display, leaderboard, error handling

#### Mocking Discord.js

Tests use mock utilities to simulate Discord objects without connecting to Discord:

```typescript
import { createMockGuild, createMockMember, createMockReaction } from '__tests__/mocks/discord';

const guild = createMockGuild();
const member = createMockMember('user-1', 'TestUser#0001', ['senpai-role-id']);
const reaction = createMockReaction('msg-1', 'author-1', 'dojo');
```

#### Test Database

Tests use PGlite (in-memory PostgreSQL) for fast, isolated testing:

```typescript
import { createTestDatabase, insertTestReaction } from '__tests__/mocks/database';

const db = await createTestDatabase();
await insertTestReaction(db, 'msg-1', 'author-1', 'reactor-1', Role.Senpai);
```

### Manual Testing Checklist

For manual/integration testing with a real Discord server:

- [ ] Bot connects and logs "ready"
- [ ] New members receive Kōhai role
- [ ] :dojo: reactions are tracked in database
- [ ] Self-reactions are ignored
- [ ] Duplicate reactions are ignored
- [ ] Promotions trigger when thresholds met
- [ ] `/stats` shows correct scores
- [ ] `/leaderboard` displays top users
- [ ] `/daimyo-sync` recalculates all roles
- [ ] Decay job runs (check logs at midnight UTC)

## License

MIT

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review logs for error messages
3. Run `/daimyo-audit` to inspect user data
4. Check [spec/REPUTATION.md](../spec/REPUTATION.md) for system design details
