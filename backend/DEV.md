# Development

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
railway run npm run test-content-pipeline -w backend
```

> [See here](https://docs.railway.com/guides/cli) for more information about installing the Railway shell locally.

To deploy Discord slash commands after changing command definitions:

```
railway run npm run deploy-commands -w backend
```

This is not part of the automatic deploy pipeline — run it manually when command definitions change.

To connect to the Railway database, run the following command:

```
railway connect postgres
```

This will open up a local psql instance.
