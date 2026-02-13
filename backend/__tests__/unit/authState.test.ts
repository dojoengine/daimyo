import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { buildOAuthState, verifyOAuthState } from '../../src/api/routes/authState.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('auth OAuth state helpers', () => {
  beforeEach(() => {
    process.env.DISCORD_SESSION_SECRET = 'test-session-secret';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('builds and verifies state for a provided jam slug', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const state = buildOAuthState('gj8');
    const verified = verifyOAuthState(state);

    expect(verified).toEqual({ jamSlug: 'gj8' });
  });

  test('defaults to gj7 when jam slug is missing', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const state = buildOAuthState();
    const verified = verifyOAuthState(state);

    expect(verified).toEqual({ jamSlug: 'gj7' });
  });

  test('rejects tampered state payload', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const state = buildOAuthState('gj8');
    const tampered = state.replace('gj8', 'gj9');

    expect(verifyOAuthState(tampered)).toBeNull();
  });

  test('rejects expired state token', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_700_000_000_000);

    const state = buildOAuthState('gj8');

    nowSpy.mockReturnValue(1_700_000_000_000 + DAY_MS + 1);

    expect(verifyOAuthState(state)).toBeNull();
  });
});
