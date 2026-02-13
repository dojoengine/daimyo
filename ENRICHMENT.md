# Game Jam Entry Enrichment

Instructions for the automated enrichment agent.
Runs after a submission PR is merged.

## Purpose

Generate structured judging data for each submission and prepend it as YAML frontmatter to the submission `.md` file.
This data powers the Daimyo judging app, where judges compare entries pairwise.

## Process

### Step 1: Identify New Entries

Find `.md` files in `game-jam-*/*.md` that were added or modified in the merge commit.
Skip files that already have YAML frontmatter (already enriched).

### Step 2: Parse the Submission

Read the submission `.md` file and extract:
- Project name
- GitHub repository URL
- Play instructions (live URL, video link, local setup)
- Team members
- Any other details the submitter provided

### Step 3: Analyze the Repository

Clone the submitted repository and gather:

#### Codebase Structure
- Count Dojo models (`#[dojo::model]`), systems/contracts (`#[dojo::contract]`), and events (`#[dojo::event]`)
- Check for frontend SDK usage (`@dojoengine/*` packages)

#### Classification
Calculate what percentage of the repository's total codebase was changed during the jam window.
Compare lines changed (additions + deletions) in jam-window commits vs total lines in the repo.
Exclude lockfiles, generated bindings, and vendored assets — they skew the ratio.

- **90% or more changed during jam** → `Whole Game`
- **Less than 90%** → `Feature`

#### Commit History
- Count total commits and jam-window commits
- Calculate `jam_commits_pct` (percentage of commits within the jam window, with 1-day buffer on each side)

#### Playability
Based on the submission's play instructions:
- `Live` — a deployed URL is provided and accessible
- `Video` — a video demo link is provided but no live deployment
- `None` — only local setup instructions or nothing

### Step 4: Generate Entry Content

Write the following fields. Quality matters — judges read these to evaluate games they can't always play.

#### `emoji`
A single emoji that represents the game's theme or genre.

#### `title`
The project name, cleaned up if needed (proper capitalization, no repo-style formatting).

#### `summary_short` (~50 words)
What the game IS.
Lead with the core mechanic or concept.
Mention the most interesting technical or gameplay feature.
Write for someone deciding whether to look closer.

#### `summary_long` (~250 words)
Expand on summary_short.
Cover: core gameplay, technical implementation, what makes it interesting.
Mention specific Dojo features used (models, systems, SDK integration).
Don't repeat the short summary verbatim — extend it.

#### `work_done_short` (~35 words)
What was BUILT during the jam specifically.
For Whole Game submissions: what the team accomplished.
For Feature submissions: what new features were added to the existing game.

#### `work_done_long` (~65 words)
Continue from work_done_short (they display as a single paragraph — the long version flows after the short).
Add technical detail: specific mechanics implemented, contracts written, frontend work done.

### Step 5: Write the Enriched File

Prepend YAML frontmatter to the submission `.md` file.
Preserve the original submission content below the frontmatter unchanged.

#### YAML Schema

```yaml
---
id: "<PR number>"
emoji: "<single emoji>"
title: "<project name>"
summary_short: >
  <~50 words>
summary_long: >
  <~250 words>
work_done_short: >
  <~35 words>
work_done_long: >
  <~65 words>
repo_url: "<GitHub URL>"
demo_url: <URL or null>
video_url: <URL or null>
team:
  - "<@username or name>"
metrics:
  classification: "<Whole Game or Feature>"
  team_size: <number>
  dojo_contracts: "<X models, Y systems, Z events>"
  jam_commits_pct: <number 0-100>
  playability: "<Live, Video, or None>"
---
```

All string values with special characters should be quoted.
Use YAML `>` (folded scalar) for multi-line prose fields.
`demo_url` and `video_url` should be `null` (not omitted) when not available.

### Step 6: Commit

Commit the enriched file with message: `enrich: <project-name>`
Push to main.

## Example

Given a submission like:

```markdown
# StarkChess

### Project Summary
Fully on-chain chess with PvP and PvC modes, spectator staking, powered by Dojo.

### GitHub
https://github.com/morelucks/stark-chess

### Play
Video demo: https://www.youtube.com/watch?v=5k4-K923fM4

### Team members
- @morelucks — Backend/Smart Contracts
- @Itodo-S — Frontend/Smart Contracts
```

The enriched file becomes:

```yaml
---
id: "42"
emoji: "♟"
title: "StarkChess"
summary_short: >
  A fully on-chain chess engine built with Dojo. Play PvP or PvC chess where
  every move is a verifiable transaction on Starknet, with spectator prediction
  staking.
summary_long: >
  All standard rules are supported — castling, en passant, pawn promotion, and
  threefold repetition draws — with each move validated by Cairo contracts before
  execution. Game state is serialized across 4 Dojo models, allowing players to
  resume matches across sessions. The PvC mode uses a minimax algorithm with
  adjustable difficulty. Spectators can stake tokens on match outcomes, with
  payouts based on prediction timing and accuracy, blending chess strategy with
  DeFi incentives. The React frontend connects via the Dojo SDK with smooth piece
  animations, move history, and real-time board updates through Torii indexing.
work_done_short: >
  Built from scratch during the jam. Full chess engine in Cairo with move
  validation, check/checkmate detection, and game state serialization across 4
  models and 3 systems.
work_done_long: >
  The engine handles all standard rules including castling, en passant, and pawn
  promotion, with each move validated on-chain before execution. Game state
  serialization allows resuming matches across sessions. A spectator staking
  system lets viewers predict outcomes and earn rewards. The React frontend uses
  the Dojo SDK for real-time board updates via Torii.
repo_url: "https://github.com/morelucks/stark-chess"
demo_url: null
video_url: "https://www.youtube.com/watch?v=5k4-K923fM4"
team:
  - "@morelucks"
  - "@Itodo-S"
metrics:
  classification: "Whole Game"
  team_size: 2
  dojo_contracts: "4 models, 3 systems"
  jam_commits_pct: 95
  playability: "Video"
---

# StarkChess

### Project Summary
Fully on-chain chess with PvP and PvC modes, spectator staking, powered by Dojo.

### GitHub
https://github.com/morelucks/stark-chess

### Play
Video demo: https://www.youtube.com/watch?v=5k4-K923fM4

### Team members
- @morelucks — Backend/Smart Contracts
- @Itodo-S — Frontend/Smart Contracts
```
