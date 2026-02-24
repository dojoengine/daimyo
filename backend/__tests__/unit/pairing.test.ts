import { describe, test, expect, beforeEach, jest } from '@jest/globals';

const mockGetComparisonsForJam = jest.fn();

jest.unstable_mockModule('../../src/services/database.js', () => ({
  getComparisonsForJam: mockGetComparisonsForJam,
}));

const { selectSessionPairs } = await import('../../src/services/pairing.js');

function makeEntry(id: string) {
  return {
    id,
    emoji: '🎮',
    title: `Entry ${id}`,
    summary_short: '',
    summary_long: '',
    work_done_short: '',
    work_done_long: '',
    repo_url: 'https://example.com',
    team: [],
    metrics: {
      classification: 'Whole Game',
      team_size: 1,
      dojo_models: 0,
      dojo_systems: 0,
      dojo_events: 0,
      frontend_sdk: false,
      jam_commits_pct: 0,
      playability: 'None',
    },
  };
}

describe('selectSessionPairs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty array when fewer than 2 entries', async () => {
    mockGetComparisonsForJam.mockResolvedValue([]);
    const pairs = await selectSessionPairs('gj8', null, [makeEntry('a')], 10);
    expect(pairs).toEqual([]);
  });

  test('returns pairs for anonymous users', async () => {
    mockGetComparisonsForJam.mockResolvedValue([]);
    const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')];

    const pairs = await selectSessionPairs('gj8', null, entries, 3);

    expect(pairs).toHaveLength(3);
    for (const pair of pairs) {
      expect(new Set([pair.entryA.id, pair.entryB.id]).size).toBe(2);
    }
  });

  test('excludes pairs already judged by authenticated user', async () => {
    mockGetComparisonsForJam.mockResolvedValue([
      {
        id: 'cmp-1',
        jam_slug: 'gj8',
        judge_id: 'judge-1',
        entry_a_id: 'a',
        entry_b_id: 'b',
        score: 1,
        timestamp: Date.now(),
      },
    ]);

    const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')];
    const pairs = await selectSessionPairs('gj8', 'judge-1', entries, 10);

    // Only 2 remaining pairs: a-c and b-c (a-b already judged)
    expect(pairs).toHaveLength(2);
    const pairSets = pairs.map((p) => [p.entryA.id, p.entryB.id].sort().join(':'));
    expect(pairSets).not.toContain('a:b');
  });

  test('returns empty when judge has exhausted all pairs', async () => {
    mockGetComparisonsForJam.mockResolvedValue([
      {
        id: '1',
        jam_slug: 'gj8',
        judge_id: 'j',
        entry_a_id: 'a',
        entry_b_id: 'b',
        score: 1,
        timestamp: 1,
      },
    ]);

    const pairs = await selectSessionPairs('gj8', 'j', [makeEntry('a'), makeEntry('b')], 10);
    expect(pairs).toEqual([]);
  });

  test('respects count parameter', async () => {
    mockGetComparisonsForJam.mockResolvedValue([]);
    const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c'), makeEntry('d')];

    const pairs = await selectSessionPairs('gj8', null, entries, 2);
    expect(pairs).toHaveLength(2);
  });

  test('returns no duplicate pairs', async () => {
    mockGetComparisonsForJam.mockResolvedValue([]);
    const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c'), makeEntry('d')];

    const pairs = await selectSessionPairs('gj8', null, entries, 6);
    const keys = pairs.map((p) => [p.entryA.id, p.entryB.id].sort().join(':'));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
