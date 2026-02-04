# Daimyō 👹

A multi-faceted role management bot for the Dojo Discord.

## Features

### [Reputation System](./spec/REPUTATION.md)
Community-driven reputation through :dojo: reactions.
Progression: Kōhai → Senpai → Sensei based on peer recognition.

**Advancement thresholds:**
- **Kohai → Senpai**: 50 reactions from ≥10% unique Senpai/Sensei
- **Senpai → Sensei**: 30 reactions from ≥20% unique Sensei, in the last 360 days

### [Blockchain Roles](./spec/BLOCKCHAIN.md)
Wallet-linked roles based on Starknet state (NFT ownership, token holdings, etc.).

### [Content Pipeline](./spec/CONTENT.md)
Automated Discord-to-Twitter content generation.
Weekly scans identify developer stories and generate Twitter thread drafts with AI-generated images, sent to Typefully for review.

## Deployment

The bot uses GitHub Actions for CI and Railway for deployment.
Pushes to `main` automatically deploy after CI passes.

### Setup

1. **Create Railway Project**
   - Go to [railway.app](https://railway.app) and sign in with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select the `daimyo` repository

2. **Add PostgreSQL Database**
   - In Railway, click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL` for your service

3. **Set Environment Variables**
   - In Railway, go to your service → Variables
   - Add environment variables (see `backend/.env.example` for reference):

4. **GitHub Branch Protection**
   - Go to GitHub repo → Settings → Branches
   - Add rule for `main` branch
   - Enable "Require status checks to pass before merging"
   - Select the `ci` check

## Ops

To run commands in the Railway environment, use the following syntax:

```
railway run pnpm run --filter backend test-content-pipeline
```

> [See here](https://docs.railway.com/guides/cli) for more information about installing the Railway shell locally.

To connect to the Railway database, run the following command:

```
railway connect postgres
```

This will open up a local psql instance.
