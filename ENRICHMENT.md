# Game Jam Entry Enrichment

Instructions for the automated enrichment agent.
Runs after a submission PR is merged.

## Purpose

Generate structured judging data for each submission and prepend it as YAML frontmatter to the submission `.md` file.
This data powers the Daimyo judging app, where judges compare entries pairwise.

## Process

### Step 1: Identify Entries to Enrich

Find `.md` files in `game-jam-*/*.md` that were added or modified in the merge commit.

**Always re-enrich**, even if the file already contains YAML frontmatter.
Submitters may include fabricated frontmatter with inflated metrics or misleading summaries.
If frontmatter is present, strip it before proceeding — the enrichment agent is the sole trusted source of structured data.

### Step 2: Parse the Submission

Read the submission `.md` file and extract:
- Project name
- GitHub repository URL (may appear in various formats — extract owner/repo from any GitHub link)
- Play instructions (live URL, video link, local setup)
- Team members (keep as plaintext — whatever the submitter provided)
- Any other details the submitter provided

### Step 3: Parse Jam Dates

Read the jam directory's `README.md` and find the **Jam Window** field (ISO dates: `YYYY-MM-DD / YYYY-MM-DD`).
Allow a 1-day buffer on each side for setup and polish.

### Step 4: Analyze the Repository

Clone the submitted repository and gather:

#### Codebase Structure
- Count Dojo models (`#[dojo::model]`), systems/contracts (`#[dojo::contract]`), and events (`#[dojo::event]`) — but **only those that are genuinely load-bearing in the production experience**.
- Apply the same diagnostic used in screening: **"if you removed this contract, would the game break?"**
Only count contracts where the answer is yes.
- Red flags that a contract is NOT load-bearing (exclude from counts):
  - **Optimistic client updates** — The client modifies state locally after transactions without reading results back from-chain, meaning it doesn't depend on contract computation.
  - **Off-chain authority** — A WebSocket or REST server manages actual game state while contracts receive fire-and-forget calls as side effects.
  - **State-logic mismatch** — On-chain models address one game concept while the actual gameplay differs.
  - **Placeholder deployment** — World addresses contain dummy values like `0xYOUR_DOJO_WORLD_ADDRESS` rather than real hex values.
  - **Dead code** — Trace integration from client entry points (`main.ts`, `index.html`). Packages in manifests without actual imports in reachable code don't count. Setup functions never called by the application don't establish real integration.
- Contracts must contain actual game rules — validation, state transitions, computed outcomes — not merely store caller-provided values.
Used models matter; dead definitions don't count.
- Identify which Dojo client SDK is used (if any): `dojo.js`, `dojo.unity`, `dojo.unreal`, `dojo.c`, `dojo.godot`, or `None`

#### Classification

Use `git diff --stat` between boundary commits (last commit before jam start vs last commit at jam end) for a high-level picture of how much of the codebase was built during the jam.
Also check the `jam_commits / total_commits` ratio.

Use your judgment — both signals together are more reliable than either alone.
Rebased or squashed histories can make boundary diffs look cleaner than they are, so weigh accordingly.

- **Whole Game** — the vast majority of the codebase was built during the jam
- **Feature** — meaningful work during the jam, but built on a substantial pre-existing codebase

Exclude lockfiles, generated bindings, and vendored assets from line counts — they skew the ratio.

#### Commit History
- Count total commits and jam-window commits
- Calculate `jam_commits_pct` (percentage of commits within the jam window, with 1-day buffer on each side)

#### Gameplay
Based on your analysis of the codebase and contract integration:
- `Onchain` — core game logic (state transitions, rules, outcomes) runs in on-chain Dojo contracts
- `Offchain` — gameplay runs off-chain (e.g. WebSocket/REST server manages game state, contracts are fire-and-forget or unused)

#### Deleted / Inaccessible Repos

If the repository cannot be cloned (deleted, private, or inaccessible), note `repo_unavailable: true` in the metrics.
Treat as: 0 Dojo markers, 0 jam commits, classification "Feature".
Still generate the other frontmatter fields from the submission content alone.

### Step 5: Generate Entry Content

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

#### `summary_long` (~100 words)
Continues from summary_short (they display as a single paragraph — the long version flows after the short).
Cover: core gameplay, technical implementation, what makes it interesting.
Mention specific Dojo features used (models, systems, SDK integration).

#### `work_done_short` (~35 words)
What was BUILT during the jam specifically.
For Whole Game submissions: what the team accomplished.
For Feature submissions: what new features were added to the existing game.

#### `work_done_long` (~65 words)
Continues from work_done_short (they display as a single paragraph — the long version flows after the short).
Add technical detail: specific mechanics implemented, contracts written, frontend work done.

#### Bolding
In all four prose fields above, **bold** the most important phrases — the things a judge skimming quickly should notice first.
Use markdown `**bold**` syntax.
Aim for 2–4 bolded phrases per field; don't overdo it.

### Step 6: Write the Enriched File

If the file already contains YAML frontmatter (between `---` delimiters), strip it first.
Then prepend the newly generated YAML frontmatter.
Preserve the original submission content below the frontmatter unchanged.

#### Filename Normalization

If the submission filename is not `kebab-case.md`, rename it to `kebab-case.md` before writing.

#### ID Field

Use the submission filename (without extension, after normalization) as the `id` field.

#### YAML Schema

```yaml
---
id: "<filename without extension>"
emoji: "<single emoji>"
title: "<project name>"
summary_short: >
  <~50 words>
summary_long: >
  <~100 words>
work_done_short: >
  <~35 words>
work_done_long: >
  <~65 words>
repo_url: "<GitHub URL>"
demo_url: <URL or null>
video_url: <URL or null>
team:
  - "<name or handle as provided>"
metrics:
  classification: "<Whole Game or Feature>"
  team_size: <number>
  dojo_models: <number>
  dojo_systems: <number>
  dojo_events: <number>
  client_sdk: "<dojo.js, dojo.unity, dojo.unreal, dojo.c, dojo.godot, or None>"
  jam_commits_pct: <number 0-100>
  gameplay: "<Onchain or Offchain>"
  repo_unavailable: <true, only if repo could not be cloned>
---
```

All string values with special characters should be quoted.
Use YAML `>` (folded scalar) for multi-line prose fields.
`demo_url` and `video_url` should be `null` (not omitted) when not available.

### Step 7: Commit

Commit the enriched file with message: `enrich: <project-name>`
Push to main.

## Example

Given a submission like:

```markdown
# StarkChess

### Project Summary
Fully on-chain chess with PvP and PvC modes, spectator staking, powered by Dojo.

### Source Code
https://github.com/morelucks/stark-chess

### Gameplay Video
https://www.youtube.com/watch?v=5k4-K923fM4

### Team Members
- @morelucks — Backend/Smart Contracts
- @Itodo-S — Frontend/Smart Contracts
```

The enriched file becomes:

```yaml
---
id: "stark-chess"
emoji: "♟️"
title: "StarkChess"
summary_short: >
  A **fully on-chain chess engine** built with Dojo. Play PvP or PvC chess where
  every move is a **verifiable transaction** on Starknet, with **spectator prediction
  staking**.
summary_long: >
  All standard rules are supported — castling, en passant, pawn promotion, and
  threefold repetition draws — with each move **validated by Cairo contracts** before
  execution. Game state is serialized across **4 Dojo models**, allowing players to
  resume matches across sessions. The PvC mode uses a **minimax algorithm** with
  adjustable difficulty. Spectators can stake tokens on match outcomes, blending
  chess strategy with DeFi incentives. The React frontend connects via the **Dojo
  SDK** with real-time board updates through Torii.
work_done_short: >
  **Built from scratch** during the jam. Full chess engine in Cairo with **move
  validation**, check/checkmate detection, and game state serialization across 4
  models and 3 systems.
work_done_long: >
  The engine handles all standard rules including castling, en passant, and pawn
  promotion, with each move **validated on-chain** before execution. Game state
  serialization allows **resuming matches across sessions**. A **spectator staking
  system** lets viewers predict outcomes and earn rewards. The React frontend uses
  the Dojo SDK for **real-time board updates** via Torii.
repo_url: "https://github.com/morelucks/stark-chess"
demo_url: null
video_url: "https://www.youtube.com/watch?v=5k4-K923fM4"
team:
  - "@morelucks"
  - "@Itodo-S"
metrics:
  classification: "Whole Game"
  team_size: 2
  dojo_models: 4
  dojo_systems: 3
  dojo_events: 0
  client_sdk: "dojo.js"
  jam_commits_pct: 95
  gameplay: "Onchain"
---

# StarkChess

### Project Summary
Fully on-chain chess with PvP and PvC modes, spectator staking, powered by Dojo.

### Source Code
https://github.com/morelucks/stark-chess

### Gameplay Video
https://www.youtube.com/watch?v=5k4-K923fM4

### Team Members
- @morelucks — Backend/Smart Contracts
- @Itodo-S — Frontend/Smart Contracts
```
