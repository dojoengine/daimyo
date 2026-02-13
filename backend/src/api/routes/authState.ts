import crypto from 'crypto';
import { getSessionSecret } from '../authConfig.js';

/**
 * Stateless OAuth state helpers for Discord auth.
 */
const STATE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_JAM_SLUG = 'gj7';

function signStatePayload(payload: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex').slice(0, 16);
}

/**
 * Create stateless OAuth state token: {timestamp}.{jam_slug}.{hmac}
 */
export function buildOAuthState(jamSlug?: string): string {
  const timestamp = Date.now().toString();
  const payload = `${timestamp}.${jamSlug || DEFAULT_JAM_SLUG}`;
  const signature = signStatePayload(payload);
  return `${payload}.${signature}`;
}

/**
 * Verify and parse OAuth state token.
 */
export function verifyOAuthState(state: string): { jamSlug: string } | null {
  const parts = state.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [timestamp, jamSlug, hmac] = parts;
  const payload = `${timestamp}.${jamSlug}`;
  const expectedHmac = signStatePayload(payload);

  if (hmac !== expectedHmac) {
    return null;
  }

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) {
    return null;
  }

  if (Date.now() - ts > STATE_TTL_MS) {
    return null;
  }

  return { jamSlug };
}
