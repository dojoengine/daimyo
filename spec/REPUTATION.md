# Discord Reputation

Discord roles based on reputation.

## Overview

Sites like StackOverflow and Discourse pioneered reputation systems where users would be automatically given enhanced privileges as a result of ongoing peer recognition. In order to enhance the Dojo Discord community and encourage mutual support among Dojo developers, we propose to introduce a similar type of reputation-based permissioning system, implemented through an open-source Discord bot called **Daimyō** (a Japanese feudal lord).

## Goals

1. **Encourage Quality Contributions**: Reward helpful Discord members with recognition and elevated status
2. **Peer Recognition**: Use community feedback (:dojo: reactions) as the basis for advancement
3. **Dynamic Hierarchy**: Maintain an adaptive role system that reflects current activity levels
4. **Legitimize Roles**: Create a trusted reputation system that can be used for other processes (judging, governance, etc.)

## Role System

### Role Hierarchy

The Daimyō bot manages three Discord roles that form a progression path:

#### 1. **Kōhai** (後輩 - Junior)
- **Default role**: All Discord members receive this upon joining
- **Requirements**: None (automatic)
- **Privileges**: Base member status

#### 2. **Senpai** (先輩 - Senior)
- **Requirements**: Accumulate **50 :dojo: reactions** from at least **CEIL(10% of total Senpai+Sensei count)** unique users with Senpai or Sensei roles
- **Privileges**: Can help promote others to Senpai, elevated community status

#### 3. **Sensei** (先生 - Teacher/Master)
- **Requirements**: Accumulate **30 :dojo: reactions** from at least **CEIL(20% of total Sensei count)** unique Sensei
- **Privileges**: Can help promote others to Sensei, highest community status
- **Decay Rule**: Must maintain 30+ Sensei reactions within the last 360 days or be demoted to Senpai (no diversity requirement for decay)

### Role Permissions Matrix

| Role | Can Promote to Senpai | Can Promote to Sensei | Automatic on Join | Subject to Decay |
|------|----------------------|----------------------|-------------------|------------------|
| Kōhai | No | No | Yes | No |
| Senpai | Yes | No | No | No |
| Sensei | Yes | Yes | No | Yes (360 days) |

## Reaction Tracking

### The :dojo: Emoji

The bot tracks reactions using the `:dojo:` emoji (custom server emoji). When a user reacts to a message with :dojo:, the following is recorded:

- **Message ID**: The message being reacted to
- **Message Author**: The user receiving recognition
- **Reactor**: The user giving the reaction
- **Reactor Role**: The role of the reactor at the time of reaction (Kōhai, Senpai, or Sensei)
- **Timestamp**: When the reaction occurred

### Reaction Rules

1. **Self-Reactions Don't Count**: Users cannot react to their own messages
2. **One Reaction Per User Per Message**: Only the first :dojo: reaction from each user counts
3. **Role Matters**: Reactions from Senpai/Sensei count toward Senpai promotion; only Sensei reactions count toward Sensei promotion
4. **Diversity Requirements**: Promotions require reactions from a minimum percentage of unique users in the qualifying role(s)
5. **Kōhai Reactions**: Reactions from Kōhai are tracked and displayed in stats but do not count toward promotion
6. **Snapshot-Based**: Reactor role at time of reaction is preserved (demotions don't retroactively invalidate past reactions)

## Promotion & Demotion Logic

### Senpai Promotion

A user is promoted from Kōhai to Senpai when:
- They accumulate **50 or more** :dojo: reactions from users with **Senpai or Sensei** roles
- These reactions must come from at least **CEIL(10% of total Senpai+Sensei)** unique users

**Calculation Method**:
```
valid_reactions = reactions where reactor_role IN [Senpai, Sensei]
unique_reactors = count_unique(valid_reactions.reactor_id)
total_reactors = count(discord_members where role IN [Senpai, Sensei])
required_unique = ceil(total_reactors * 0.10)

if count(valid_reactions) >= 50 AND unique_reactors >= required_unique:
    promote_to_senpai()
```

**Examples**:
- 10 Senpai+Sensei total → need 50 reactions from ≥1 unique user
- 30 Senpai+Sensei total → need 50 reactions from ≥3 unique users

### Sensei Promotion

A user is promoted from Senpai to Sensei when:
- They accumulate **30 or more** :dojo: reactions from users with **Sensei** role
- These reactions must come from at least **CEIL(20% of total Sensei count)** unique Sensei

**Calculation Method**:
```
valid_reactions = reactions where reactor_role IN [Sensei]
unique_reactors = count_unique(valid_reactions.reactor_id)
total_reactors = count(discord_members where role == Sensei)
required_unique = ceil(total_reactors * 0.20)

if count(valid_reactions) >= 30 AND unique_reactors >= required_unique:
    promote_to_sensei()
```

**Examples**:
- 5 Sensei total → need 30 reactions from ≥1 unique Sensei
- 20 Sensei total → need 30 reactions from ≥4 unique Sensei

**Bootstrap Note**: Initial Sensei roles will be manually assigned by admins using the `/daimyo-set-role` command.

### Sensei Demotion (Decay)

A Sensei is demoted to Senpai if their time-windowed Sensei score falls below **30** within a **360-day rolling window**.

**Calculation Method**:
```
recent_sensei_reactions = reactions where
    reactor_role == Sensei AND
    timestamp >= (now - 360 days)

if count(recent_sensei_reactions) < 30:
    demote_to_senpai()
```

**Decay Check Frequency**: Run daily at midnight UTC

### Edge Cases

1. **Reactor Demotion**: When a Sensei is demoted to Senpai, their past reactions still count as Sensei reactions (snapshot at time of reaction)
2. **Reactor Removal**: If a user leaves the server, their reactions remain in the database and continue to count
3. **Multiple Promotions**: A user could theoretically go from Kōhai → Senpai → Sensei in quick succession if they have enough qualifying reactions

## Commands

### User Commands

#### `/stats [user]`
Display reputation statistics for a user (defaults to command invoker)

**Response includes**:
- Current role
- Total :dojo: reactions received
- Breakdown by reactor role (Kōhai, Senpai, Sensei)
- Progress to next role
- For Sensei: time-windowed score

**Example Output (Kōhai → Senpai)**:
```
🎌 Reputation Stats for @username

Current Role: Kōhai
Total :dojo: reactions: 38
  - From Kōhai: 15 (display only)
  - From Senpai: 18
  - From Sensei: 5

Progress to Senpai: 23/50 reactions (27 more needed) | 8/10 unique reactors ✓
(Requires 50 reactions from 10 unique Senpai/Sensei - currently 10% of 100 total)
```

**Example Output (Senpai → Sensei)**:
```
🎌 Reputation Stats for @username

Current Role: Senpai
Total :dojo: reactions: 147
  - From Kōhai: 32 (display only)
  - From Senpai: 45
  - From Sensei: 70

Progress to Sensei: 70/30 reactions ✓ | 5/8 unique Sensei (3 more needed)
(Requires 30 reactions from 8 unique Sensei - currently 20% of 40 Sensei)
```

**Example Output (Sensei with decay status)**:
```
🎌 Reputation Stats for @username

Current Role: Sensei
Total :dojo: reactions (all-time): 312
  - From Kōhai: 89 (display only)
  - From Senpai: 134
  - From Sensei: 89

Sensei reactions (last 360 days): 42/30 ✓
```

#### `/leaderboard [role]`
Display top users by reputation, optionally filtered by role

**Arguments**:
- `role` (optional): Filter to show only users with a specific role

**Example Output**:
```
🏆 Daimyō Leaderboard (Sensei)

1. @user1 - 245 Sensei reactions
2. @user2 - 198 Sensei reactions
3. @user3 - 167 Sensei reactions
...
```

### Admin Commands.

#### `/daimyo-sync`
Manually trigger a full sync of roles based on current reaction counts.
Recalculates all scores, applies promotions and demotions, and returns summary of changes.

#### `/daimyo-audit [user]`
Display detailed audit information for a user's reputation data.
Shows all reactions received with timestamps and reactor info, score calculations, and role history.

## Data Storage

### Database Schema

The database stores only historical event data.
All current state (roles, members, join dates) is queried from Discord.

#### Reactions Table
```
reactions {
    id: uuid (primary key)
    message_id: string
    message_author_id: string  // Discord user ID
    reactor_id: string         // Discord user ID
    reactor_role_at_time: enum(Kohai, Senpai, Sensei)
    timestamp: timestamp

    unique(message_id, reactor_id)  // one reaction per user per message
}
```

#### Role History Table
```
role_history {
    id: uuid (primary key)
    user_id: string  // Discord user ID
    role: enum(Kohai, Senpai, Sensei)
    reason: string  // "promotion", "demotion", "decay"
    timestamp: timestamp
}
```

### Storage Technology

**SQLite** is used for storing historical event data.
File-based, no external dependencies, and sufficient for a single-server bot.
Easy to backup and version control.

PostgreSQL or similar would be needed for multi-server scaling in the future.

## Technical Architecture

### Tech Stack
- **Language**: TypeScript
- **Framework**: Discord.js v14
- **Database**: SQLite with better-sqlite3
- **Database Access**: Raw SQL
- **Scheduling**: node-cron (for daily decay checks)
- **Testing**: Jest
- **Linting**: ESLint + Prettier

### Bot Structure

```
daimyo/
├── backend/
│   ├── src/
│   │   ├── index.ts                    # Entry point, client initialization
│   │   ├── events/
│   │   │   ├── ready.ts                # Bot ready event
│   │   │   ├── messageReactionAdd.ts   # Track :dojo: reactions
│   │   │   └── guildMemberAdd.ts       # Auto-assign Kohai role
│   │   ├── commands/
│   │   │   ├── stats.ts                # /stats command
│   │   │   ├── leaderboard.ts          # /leaderboard command
│   │   │   ├── sync.ts                 # /daimyo-sync command
│   │   │   └── audit.ts                # /daimyo-audit command
│   │   ├── services/
│   │   │   ├── database.ts             # Database connection and queries
│   │   │   ├── reputation.ts           # Reputation calculation logic
│   │   │   ├── roleManager.ts          # Discord role assignment
│   │   │   └── decay.ts                # Decay calculation and enforcement
│   │   ├── jobs/
│   │   │   └── decayCheck.ts           # Daily cron job for decay
│   │   ├── utils/
│   │   │   ├── config.ts               # Configuration management
│   │   │   └── logger.ts               # Logging utility
│   │   └── types.ts                    # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── spec/
│   ├── REPUTATION.md                   # This document
│   └── BLOCKCHAIN.md
└── README.md
```

### Key Components

#### 1. Event Handlers
- **messageReactionAdd**: Validate reactions, store in database, check for promotion
- **guildMemberAdd**: Assign Kōhai role to new members
- Reactions are tracked in all server channels

#### 2. Reputation Service
- Calculate Senpai and Sensei scores for users
- Apply promotion/demotion logic
- Interface with Role Manager to update Discord roles
- Send DM to user when promoted or demoted
- Promotion checks triggered on each reaction and during daily cron job

#### 3. Role Manager
- Assign/remove Discord roles via API
- Query current roles via Discord.js member cache
- Handle errors gracefully (missing permissions, etc.)
- Discord roles are the source of truth for user status

#### 4. Decay Job
- Runs daily at midnight UTC using node-cron
- Checks all users for promotion/demotion eligibility
- Identifies Sensei users with insufficient recent reactions
- Triggers promotions/demotions through Reputation Service

### Role State Management

**Discord as Source of Truth**:
Current user roles are NOT stored in the database.
Discord roles are authoritative.

**Role Lookups**:
The bot uses Discord.js's built-in member cache for role queries.
With the `GuildMembers` intent enabled, Discord.js maintains a local cache of all members and their roles.
Role lookups are in-memory and require no API calls.

**On Startup**:
The bot fetches all guild members on the `ready` event to populate the cache.
After startup, the cache auto-updates via gateway events.

**Historical Data**:
The `reactions` table preserves `reactor_role_at_time` as a snapshot for historical accuracy.
The `role_history` table provides an audit trail of role changes.

### Configuration

Environment variables required:
```
DISCORD_BOT_TOKEN=<your_bot_token>
DISCORD_GUILD_ID=<dojo_discord_server_id>
DOJO_EMOJI_NAME=dojo
DOJO_EMOJI_ID=<custom_emoji_id>  # if custom emoji
KOHAI_ROLE_ID=<role_id>
SENPAI_ROLE_ID=<role_id>
SENSEI_ROLE_ID=<role_id>
DATABASE_PATH=./daimyo.db
DECAY_WINDOW_DAYS=360
SENPAI_REACTION_THRESHOLD=50
SENPAI_UNIQUE_PERCENT=0.10
SENSEI_REACTION_THRESHOLD=30
SENSEI_UNIQUE_PERCENT=0.20
```

### Discord Intents Required
- `Guilds` - Access to guild info
- `GuildMembers` - Track member joins and maintain member/role cache
- `GuildMessageReactions` - Core functionality
- `GuildMessages` - Context for reactions (may not be needed)

### Discord Permissions Required
- Read Messages/View Channels
- Manage Roles
- Use Slash Commands
- Add Reactions (for testing/verification)

### Deployment Notes
- Slash commands must be registered with Discord before the bot starts using the Discord REST API
- Commands can be registered globally or per-guild (recommend per-guild for development, global for production)

## Future Enhancements

- **Percentage-Based Scaling**: Add upper bounds or more sophisticated scaling for diversity requirements as community grows very large
- **Badges/Achievements**: Award special badges for milestones (e.g., "First Sensei", "100 Reactions in a Month")
- **Reaction Velocity**: Track and display trending contributors
- **Category-Based Reputation**: Track reactions by channel category (e.g., "Cairo Expert", "Networking Guru")
- **Kōhai Contribution Badges**: Special cosmetic badges for Kōhai who give many helpful reactions
- **Multi-Server Support**: Allow Daimyō to run on multiple Discord servers
- **Web Dashboard**: Display leaderboards and stats on a public website
- **Integration with Other Systems**: Use reputation scores in Game Jam judging, governance voting weights, etc.
- **Nomination System**: Allow Sensei to nominate worthy members for expedited promotion
- **Appeals Process**: Allow users to appeal demotions or request manual review

*This specification is a living document and will be updated as the project evolves.*
