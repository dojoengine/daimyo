import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { optionalAuthMiddleware, createSessionToken, AuthUser } from '../middleware/auth.js';

const router: express.Router = express.Router();

const DISCORD_SESSION_SECRET =
  process.env.DISCORD_SESSION_SECRET || 'dev-secret-change-in-production';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const SENSEI_ROLE_ID = process.env.SENSEI_ROLE_ID;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

/** Derive the OAuth callback URI from the incoming request's Host header. */
function getRedirectUri(req: Request): string {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/api/auth/callback`;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

interface DiscordMember {
  roles: string[];
}

// GET /api/auth/me - Get current user info
router.get('/me', optionalAuthMiddleware, (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json(req.user);
});

// GET /api/auth/discord?jam={slug} - Start Discord OAuth flow
router.get('/discord', (req: Request, res: Response): void => {
  const jamSlug = req.query.jam as string;

  if (!DISCORD_CLIENT_ID) {
    res.status(500).json({ error: 'Discord OAuth not configured' });
    return;
  }

  // Create stateless state token: {timestamp}.{jam_slug}.{hmac}
  const timestamp = Date.now().toString();
  const data = `${timestamp}.${jamSlug || 'gj7'}`;
  const hmac = crypto
    .createHmac('sha256', DISCORD_SESSION_SECRET)
    .update(data)
    .digest('hex')
    .slice(0, 16);
  const state = `${data}.${hmac}`;

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: getRedirectUri(req),
    response_type: 'code',
    scope: 'identify guilds.members.read',
    state,
  });

  const url = `https://discord.com/api/oauth2/authorize?${params}`;
  res.json({ url });
});

// GET /api/auth/callback - Handle Discord OAuth callback
router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    res.redirect(`/error?reason=auth`);
    return;
  }

  if (!code || !state) {
    res.redirect(`/error?reason=auth`);
    return;
  }

  // Verify state token
  const parts = (state as string).split('.');
  if (parts.length !== 3) {
    res.redirect(`/error?reason=auth`);
    return;
  }

  const [timestamp, jamSlug, hmac] = parts;
  const data = `${timestamp}.${jamSlug}`;
  const expectedHmac = crypto
    .createHmac('sha256', DISCORD_SESSION_SECRET)
    .update(data)
    .digest('hex')
    .slice(0, 16);

  if (hmac !== expectedHmac) {
    res.redirect(`/error?reason=auth`);
    return;
  }

  // Check timestamp (24 hour TTL)
  const ts = parseInt(timestamp, 10);
  if (Date.now() - ts > 24 * 60 * 60 * 1000) {
    res.redirect(`/error?reason=auth`);
    return;
  }

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    res.redirect(`/error?reason=auth`);
    return;
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: getRedirectUri(req),
      }),
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text());
      res.redirect(`/error?reason=auth`);
      return;
    }

    const tokenData = (await tokenRes.json()) as DiscordTokenResponse;
    const accessToken = tokenData.access_token;

    // Get user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      res.redirect(`/error?reason=auth`);
      return;
    }

    const userData = (await userRes.json()) as DiscordUser;

    // Check if user has Sensei role in the guild
    if (SENSEI_ROLE_ID && DISCORD_GUILD_ID) {
      const memberRes = await fetch(
        `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!memberRes.ok) {
        console.error('Failed to get member info:', await memberRes.text());
        res.redirect(`/error?reason=role`);
        return;
      }

      const memberData = (await memberRes.json()) as DiscordMember;
      const hasRole = memberData.roles?.includes(SENSEI_ROLE_ID);

      if (!hasRole) {
        res.redirect(`/error?reason=role`);
        return;
      }
    }

    // Create session
    const user: AuthUser = {
      id: userData.id,
      username: userData.username,
      avatar: userData.avatar
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
        : undefined,
    };

    const token = createSessionToken(user);

    // Set cookie and redirect
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.redirect(`/judge/${jamSlug}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`/error?reason=auth`);
  }
});

// POST /api/auth/logout - Clear session
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('session');
  res.json({ success: true });
});

export default router;
