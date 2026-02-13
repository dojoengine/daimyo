import express, { Request, Response } from 'express';
import { optionalAuthMiddleware, createSessionToken, AuthUser } from '../middleware/auth.js';
import { getDiscordOAuthConfig } from '../authConfig.js';
import { buildOAuthState, verifyOAuthState } from './authState.js';

const router: express.Router = express.Router();

type AuthErrorReason = 'auth' | 'role';

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

/** Derive the OAuth callback URI from the incoming request's Host header. */
function getRedirectUri(req: Request): string {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/api/auth/callback`;
}

function redirectWithReason(res: Response, reason: AuthErrorReason): void {
  res.redirect(`/error?reason=${reason}`);
}

async function exchangeCodeForAccessToken(
  req: Request,
  code: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(req),
    }),
  });

  if (!tokenRes.ok) {
    console.error('Token exchange failed:', await tokenRes.text());
    return null;
  }

  const tokenData = (await tokenRes.json()) as DiscordTokenResponse;
  return tokenData.access_token;
}

async function fetchCurrentDiscordUser(accessToken: string): Promise<DiscordUser | null> {
  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    return null;
  }

  return (await userRes.json()) as DiscordUser;
}

async function checkSenseiRole(
  accessToken: string,
  senseiRoleId: string,
  guildId: string
): Promise<{ hasRole: boolean; requestFailed: boolean }> {
  const memberRes = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!memberRes.ok) {
    console.error('Failed to get member info:', await memberRes.text());
    return { hasRole: false, requestFailed: true };
  }

  const memberData = (await memberRes.json()) as DiscordMember;
  return {
    hasRole: memberData.roles?.includes(senseiRoleId) || false,
    requestFailed: false,
  };
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
  const { clientId } = getDiscordOAuthConfig();

  if (!clientId) {
    res.status(500).json({ error: 'Discord OAuth not configured' });
    return;
  }

  const state = buildOAuthState(jamSlug);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(req),
    response_type: 'code',
    scope: 'identify guilds.members.read',
    state,
  });

  const url = `https://discord.com/api/oauth2/authorize?${params}`;
  res.redirect(url);
});

// GET /api/auth/callback - Handle Discord OAuth callback
router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError || !code || !state) {
    redirectWithReason(res, 'auth');
    return;
  }

  const verifiedState = verifyOAuthState(state as string);
  if (!verifiedState) {
    redirectWithReason(res, 'auth');
    return;
  }

  const { jamSlug } = verifiedState;
  const { clientId, clientSecret, senseiRoleId, guildId } = getDiscordOAuthConfig();

  if (!clientId || !clientSecret) {
    redirectWithReason(res, 'auth');
    return;
  }

  try {
    const accessToken = await exchangeCodeForAccessToken(
      req,
      code as string,
      clientId,
      clientSecret
    );
    if (!accessToken) {
      redirectWithReason(res, 'auth');
      return;
    }

    const userData = await fetchCurrentDiscordUser(accessToken);
    if (!userData) {
      redirectWithReason(res, 'auth');
      return;
    }

    // Check if user has Sensei role in the guild
    if (senseiRoleId && guildId) {
      const roleCheck = await checkSenseiRole(accessToken, senseiRoleId, guildId);

      if (roleCheck.requestFailed || !roleCheck.hasRole) {
        redirectWithReason(res, 'role');
        return;
      }
    }

    const user: AuthUser = {
      id: userData.id,
      username: userData.username,
      avatar: userData.avatar
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
        : undefined,
    };

    const token = createSessionToken(user);

    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.redirect(`/judge/${jamSlug}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    redirectWithReason(res, 'auth');
  }
});

// POST /api/auth/logout - Clear session
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('session');
  res.json({ success: true });
});

export default router;
