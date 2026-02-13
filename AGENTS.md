<!-- SKILLS_INDEX_START -->
[Agent Skills Index]|root: ./agents|IMPORTANT: Prefer retrieval-led reasoning over pre-training for any tasks covered by skills.|skills|create-a-plan:{create-a-plan.md},create-pr:{create-pr.md}
<!-- SKILLS_INDEX_END -->
# Agent Instructions

This repository uses `AGENTS.md` as the canonical agent prompt.
`CLAUDE.md` is a symlink to `AGENTS.md`.

## Project Overview

**Daimyo** is a Discord bot and web app for the Dojo ecosystem.
It has three features:

1. **Reputation System** — Track `:dojo:` emoji reactions to promote members through Kohai → Senpai → Sensei roles, with time-based decay.
2. **Game Jam Judging** — Pairwise comparison voting app where Sensei-role judges rank game jam entries on a 5-point Likert scale.
3. **Content Pipeline** — AI-powered weekly scan of Discord messages to generate Twitter thread drafts via Typefully.

Specs live in `spec/` (REPUTATION.md, JUDGING.md, CONTENT.md, BLOCKCHAIN.md).
Entry enrichment instructions are in `ENRICHMENT.md`.

## Architecture

npm workspaces monorepo with two packages:

- **`backend/`** — Node.js (ES modules), Express v5, Discord.js v14, PostgreSQL via `postgres` lib.
  Runs the Discord bot and API server in a single process.
  Entry point: `src/index.ts` (bot + API), `src/api-server.ts` (API only).
- **`client/`** — React 18, Vite, React Router v7.
  Pairwise judging UI and landing page.
  No state library — one custom hook (`useJudging`) manages all state.

Deployed on Railway.
Build: `npm run build -w client && npm run build -w backend`.
Pre-deploy migration: `npm run migrate -w backend`.
Start: `npm run start -w backend`.

## Development

Node 22 (see `.nvmrc`). Package manager is npm.

```sh
npm install                    # install all workspace deps
npm run dev -w backend         # watch bot + API (tsx watch)
npm run dev:api -w backend     # watch API only
npm run dev -w client          # vite dev server (port 5173, proxies /api to :3000)
```

Set `DEV_AUTH_BYPASS=true` in backend `.env` to skip Discord OAuth and use dummy data.

## Database

PostgreSQL. Connection via `DATABASE_URL` env var.
Uses `postgres` (not `pg`) for queries and `node-pg-migrate` for migrations.

```sh
npm run migrate -w backend           # apply migrations
npm run migrate:down -w backend      # rollback
npm run migrate:create -w backend -- <name>  # new migration
```

Migrations are CommonJS (`.cjs`) in `backend/migrations/`.

Tables:
- `reactions` — `:dojo:` reaction records (message_id, author_id, reactor_id, reactor_role, timestamp).
- `jam_comparisons` — pairwise votes (jam_slug, judge_id, entry_a_id, entry_b_id, score).

## Testing

Jest v30 with ts-jest. Tests in `backend/__tests__/`.
Uses PGlite (in-memory Postgres) for database tests.

```sh
npm test -w backend
npm run test:watch -w backend
npm run test:coverage -w backend
```

Coverage thresholds enforced for `reputation.ts`, `roleManager.ts`, `decay.ts`.

## Linting & Formatting

ESLint + Prettier. Pre-commit hook runs `lint-staged` on backend.

```sh
npm run lint -w backend
npm run lint:fix -w backend
npm run format -w backend
```

## CI

GitHub Actions (`.github/workflows/ci.yml`): lint → typecheck → test on Node 22.
Automated Claude code review on PRs (`.github/workflows/claude-code-review.yml`).

## Key Backend Structure

```
backend/src/
├── api/
│   ├── routes/auth.ts       # Discord OAuth (login, callback, logout, /me)
│   ├── routes/jams.ts       # GET /api/jams/:slug/pair, POST /api/jams/:slug/vote
│   └── middleware/auth.ts    # JWT session middleware
├── commands/                 # Discord slash commands (stats, leaderboard, sync, bow, audit)
├── events/                   # Discord event handlers (reaction tracking, member join, ready)
├── jobs/                     # Cron jobs (decay check, ohayo greeting, content pipeline)
├── services/
│   ├── database.ts           # All SQL queries
│   ├── reputation.ts         # Promotion/demotion scoring logic
│   ├── roleManager.ts        # Discord role assignment
│   ├── decay.ts              # Sensei decay mechanics
│   ├── meijin.ts             # Meijin title rotation
│   ├── entries.ts            # Game jam entry loading from GitHub (YAML frontmatter)
│   ├── pairing.ts            # Beta-distribution uncertainty sampling for pair selection
│   ├── ranking.ts            # Spectral ranking (PageRank-style)
│   └── ai/                   # OpenAI + Anthropic providers for content pipeline
└── utils/config.ts           # Environment variable loader with defaults
```

## Key Client Structure

```
client/src/
├── pages/
│   ├── Home.tsx              # Landing page
│   ├── Judge.tsx             # Main judging interface
│   ├── AuthCallback.tsx      # OAuth callback handler
│   └── Error.tsx             # Error display
├── components/
│   ├── ComparisonView.tsx    # Side-by-side entry comparison with sparkle animations
│   ├── EntryCard.tsx         # Game entry display card with expandable sections
│   ├── LikertScale.tsx       # 5-point voting widget (scores map to 0.0–1.0)
│   ├── MetricChip.tsx        # Entry metadata badges
│   ├── ProgressBar.tsx       # Session progress tracker
│   └── Login.tsx             # Discord OAuth login button
├── hooks/useJudging.tsx      # Core judging state + API integration
└── utils/jam.ts              # Jam slug → roman numeral conversion
```

Styling: plain CSS with custom properties.
Design: feudal Japanese cyberpunk — dark theme, neon red accents, gold shimmer, kanji watermarks.
Design system documented in `client/DESIGN.md`.

## Environment Variables

Required for the bot:
`DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_CLIENT_ID`, `DOJO_EMOJI_NAME`,
`KOHAI_ROLE_ID`, `SENPAI_ROLE_ID`, `SENSEI_ROLE_ID`, `MEIJIN_ROLE_ID`,
`FELT_ROLE_ID`, `TEAM_ROLE_ID`, `OHAYO_CHANNEL_ID`, `DATABASE_URL`.

Optional:
`DISCORD_CLIENT_SECRET`, `DISCORD_SESSION_SECRET`, `CORS_ORIGIN`, `PORT`,
`DEV_AUTH_BYPASS`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `TYPEFULLY_API_KEY`,
`LLM_MODEL` (default: `claude-sonnet-4-20250514`).

Cron schedules: `DECAY_CHECK_CRON`, `OHAYO_CRON`, `CONTENT_PIPELINE_CRON`.
Thresholds: `SENPAI_REACTION_THRESHOLD` (50), `SENSEI_REACTION_THRESHOLD` (30),
`SENPAI_UNIQUE_PERCENT` (0.1), `SENSEI_UNIQUE_PERCENT` (0.2),
`DECAY_WINDOW_DAYS` (360), `MEIJIN_WINDOW_DAYS` (30).

Full config with defaults in `backend/src/utils/config.ts`.

## Conventions

- ES modules throughout (`"type": "module"`).
- TypeScript strict mode in both packages.
- Database queries use tagged template literals via the `postgres` library (not string concatenation).
- Each CSS file is scoped to its component (e.g., `EntryCard.css` for `EntryCard.tsx`).
- Game jam entries are stored as markdown files with YAML frontmatter in the `dojoengine/game-jams` GitHub repo, fetched and cached at runtime.
- Do not commit `.env` files.
