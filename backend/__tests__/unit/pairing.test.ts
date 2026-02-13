import { describe, test, expect, beforeEach, jest } from '@jest/globals';

const mockGetComparisonsForJam = jest.fn();
const mockGetComparisonCountForJudge = jest.fn();

jest.unstable_mockModule('../../src/services/database.js', () => ({
  getComparisonsForJam: mockGetComparisonsForJam,
  getComparisonCountForJudge: mockGetComparisonCountForJudge,
}));

const { selectNextPair, getSessionProgress, hasExhaustedAllPairs } =
  await import('../../src/services/pairing.js');

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
      dojo_contracts: '',
      jam_commits_pct: 0,
      playability: 'None',
    },
  };
}

describe('pairing service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getSessionProgress derives completed and sessions from judge comparison count', async () => {
    mockGetComparisonCountForJudge.mockResolvedValue(12);

    const progress = await getSessionProgress('gj8', 'judge-1');

    expect(mockGetComparisonCountForJudge).toHaveBeenCalledWith('gj8', 'judge-1');
    expect(progress).toEqual({ completed: 2, total: 10, sessions: 1 });
  });

  test('hasExhaustedAllPairs returns true when count reaches total pair count', async () => {
    mockGetComparisonCountForJudge.mockResolvedValue(3);

    const exhausted = await hasExhaustedAllPairs('gj8', 'judge-1', [
      makeEntry('a'),
      makeEntry('b'),
      makeEntry('c'),
    ]);

    expect(exhausted).toBe(true);
  });

  test('hasExhaustedAllPairs returns false when count is below total pair count', async () => {
    mockGetComparisonCountForJudge.mockResolvedValue(2);

    const exhausted = await hasExhaustedAllPairs('gj8', 'judge-1', [
      makeEntry('a'),
      makeEntry('b'),
      makeEntry('c'),
    ]);

    expect(exhausted).toBe(false);
  });

  test('selectNextPair returns null when judge has already compared all pairs', async () => {
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

    const pair = await selectNextPair('gj8', 'judge-1', [makeEntry('a'), makeEntry('b')]);

    expect(pair).toBeNull();
  });

  test('selectNextPair returns an available pair for a judge', async () => {
    mockGetComparisonsForJam.mockResolvedValue([]);

    const pair = await selectNextPair('gj8', 'judge-1', [makeEntry('a'), makeEntry('b')]);

    expect(pair).not.toBeNull();
    expect(new Set([pair!.entryA.id, pair!.entryB.id])).toEqual(new Set(['a', 'b']));
  });
});
