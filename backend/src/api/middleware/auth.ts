import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getSessionSecret, isDevAuthBypass } from '../authConfig.js';

export interface AuthUser {
  id: string;
  username: string;
  avatar?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Dev bypass user for local testing
const DEV_USER: AuthUser = {
  id: 'dev-user-123',
  username: 'DevSensei',
  avatar: undefined,
};

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Dev bypass mode - auto-authenticate as a mock user
  if (isDevAuthBypass()) {
    req.user = DEV_USER;
    return next();
  }

  // Check for session cookie
  const token = req.cookies?.session;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, getSessionSecret()) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid session' });
  }
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Dev bypass mode - auto-authenticate as a mock user
  if (isDevAuthBypass()) {
    req.user = DEV_USER;
    return next();
  }

  // Check for session cookie (optional - don't fail if missing)
  const token = req.cookies?.session;
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, getSessionSecret()) as AuthUser;
    req.user = decoded;
  } catch {
    // Invalid token - treat as unauthenticated
  }

  next();
}

export function createSessionToken(user: AuthUser): string {
  return jwt.sign(user, getSessionSecret(), { expiresIn: '7d' });
}
