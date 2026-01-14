# Daimyō 👹

A multi-faceted role management bot for the Dojo Discord.

## Features

### [Reputation System](./spec/REPUTATION.md)
Community-driven reputation through :dojo: reactions.
Progression: Kōhai → Senpai → Sensei based on peer recognition.

### [Blockchain Roles](./spec/BLOCKCHAIN.md)
Wallet-linked roles based on Starknet state (NFT ownership, token holdings, etc.).

## Deployment

The bot uses GitHub Actions for CI and Railway for deployment.
Pushes to `main` automatically deploy after CI passes.

### Setup

1. **Create Railway Project**
   - Go to [railway.app](https://railway.app) and sign in with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select the `daimyo` repository

2. **Set Environment Variables**
   - In Railway, go to your service → Variables
   - Add the following (see `backend/.env.example` for reference):
     ```
     DISCORD_BOT_TOKEN=<your token>
     DISCORD_GUILD_ID=<your guild id>
     DISCORD_CLIENT_ID=<your client id>
     DOJO_EMOJI_NAME=dojo
     KOHAI_ROLE_ID=<role id>
     SENPAI_ROLE_ID=<role id>
     SENSEI_ROLE_ID=<role id>
     DATABASE_PATH=/data/daimyo.db
     DECAY_WINDOW_DAYS=360
     SENPAI_REACTION_THRESHOLD=50
     SENPAI_UNIQUE_PERCENT=0.10
     SENSEI_REACTION_THRESHOLD=30
     SENSEI_UNIQUE_PERCENT=0.20
     ```

3. **Create Volume for Database**
   - In Railway, click your service → Settings → Volumes
   - Add a volume with mount path `/data`
   - This persists the SQLite database across deployments

4. **(Optional) GitHub Branch Protection**
   - Go to GitHub repo → Settings → Branches
   - Add rule for `main` branch
   - Enable "Require status checks to pass before merging"
   - Select the `ci` check
