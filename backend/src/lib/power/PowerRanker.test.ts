import { describe, test, expect } from '@jest/globals';
import { PowerRanker, pairKey } from './PowerRanker.js';

// Pseudocount constant: k = PSEUDOCOUNT_C * numParticipants
const PSEUDOCOUNT_C = 0.05;
const NUM_PARTICIPANTS = 3;
const K = PSEUDOCOUNT_C * NUM_PARTICIPANTS; // 0.15

// Items sorted numerically (PowerRanker sorts on construction)
const ITEM_A = 1;
const ITEM_B = 2;
const ITEM_C = 3;

function makeItems(...ids: number[]): Set<string> {
  return new Set(ids.map(String));
}

function pref(target: number, source: number, value: number) {
  return { target: String(target), source: String(source), value };
}

function score(rankings: Map<string, number>, item: number): number {
  return rankings.get(String(item))!;
}

describe('PowerRanker', () => {
  describe('generating rankings', () => {
    test('handles less than two items', () => {
      expect(() => new PowerRanker({ items: new Set(['1']) })).toThrow(
        'Cannot rank less than two items'
      );

      expect(() => new PowerRanker({ items: new Set() })).toThrow(
        'Cannot rank less than two items'
      );
    });

    test('returns uniform rankings with no preferences', () => {
      const ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });

      const rankings = ranker.run();

      expect(score(rankings, ITEM_A)).toBeCloseTo(1 / 3);
      expect(score(rankings, ITEM_B)).toBeCloseTo(1 / 3);
      expect(score(rankings, ITEM_C)).toBeCloseTo(1 / 3);
    });

    test('ranks by strong preferences', () => {
      // Prefer A over B, and B over C
      const ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });

      ranker.addPreferences([pref(ITEM_A, ITEM_B, 1), pref(ITEM_B, ITEM_C, 1)]);

      const rankings = ranker.run();

      expect(score(rankings, ITEM_A)).toBeCloseTo(0.6504044299518104);
      expect(score(rankings, ITEM_B)).toBeCloseTo(0.25639052368514753);
      expect(score(rankings, ITEM_C)).toBeCloseTo(0.093205046363043);
    });

    test('ranks by mild preferences', () => {
      // Slightly prefer A over B, and B over C
      const ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });

      ranker.addPreferences([pref(ITEM_A, ITEM_B, 0.7), pref(ITEM_B, ITEM_C, 0.7)]);

      const rankings = ranker.run();

      expect(score(rankings, ITEM_A)).toBeCloseTo(0.5109403527338869);
      expect(score(rankings, ITEM_B)).toBeCloseTo(0.32920913470298835);
      expect(score(rankings, ITEM_C)).toBeCloseTo(0.15985051256312477);
    });

    test('ranks with complex preferences', () => {
      // Prefer both A and C over B
      const ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });

      ranker.addPreferences([pref(ITEM_A, ITEM_B, 1), pref(ITEM_C, ITEM_B, 1)]);

      const rankings = ranker.run();

      expect(score(rankings, ITEM_A)).toBeCloseTo(0.45208724954750107);
      expect(score(rankings, ITEM_B)).toBeCloseTo(0.09582550090499836);
      expect(score(rankings, ITEM_C)).toBeCloseTo(0.45208724954750096);
    });

    test('handles circular preferences', () => {
      // A > B > C > A — should resolve to equal
      const ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });

      ranker.addPreferences([
        pref(ITEM_A, ITEM_B, 1),
        pref(ITEM_B, ITEM_C, 1),
        pref(ITEM_C, ITEM_A, 1),
      ]);

      const rankings = ranker.run();

      expect(score(rankings, ITEM_A)).toBeCloseTo(1 / 3);
      expect(score(rankings, ITEM_B)).toBeCloseTo(1 / 3);
      expect(score(rankings, ITEM_C)).toBeCloseTo(1 / 3);
    });

    test('rankings shift when preferences change', () => {
      // In choreWheel, getProposedChoreRankings creates a fresh ranker
      // with merged preferences each time (new prefs replace old ones for same pair).
      // Here we simulate that by creating a new ranker per scenario.

      // Scenario 1: strong A>B, strong B>C
      let ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });
      ranker.addPreferences([pref(ITEM_A, ITEM_B, 1), pref(ITEM_B, ITEM_C, 1)]);
      let rankings = ranker.run();
      expect(score(rankings, ITEM_A)).toBeCloseTo(0.6504044299518104);
      expect(score(rankings, ITEM_B)).toBeCloseTo(0.25639052368514753);
      expect(score(rankings, ITEM_C)).toBeCloseTo(0.093205046363043);

      // Scenario 2: soften A>B to 0.7, keep strong B>C
      ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });
      ranker.addPreferences([pref(ITEM_A, ITEM_B, 0.7), pref(ITEM_B, ITEM_C, 1)]);
      rankings = ranker.run();
      expect(score(rankings, ITEM_A)).toBeCloseTo(0.4395874692001581);
      expect(score(rankings, ITEM_B)).toBeCloseTo(0.43882103155500896);
      expect(score(rankings, ITEM_C)).toBeCloseTo(0.12159149924483303);

      // Scenario 3: soften both to 0.7
      ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });
      ranker.addPreferences([pref(ITEM_A, ITEM_B, 0.7), pref(ITEM_B, ITEM_C, 0.7)]);
      rankings = ranker.run();
      expect(score(rankings, ITEM_A)).toBeCloseTo(0.5109403527338869);
      expect(score(rankings, ITEM_B)).toBeCloseTo(0.32920913470298835);
      expect(score(rankings, ITEM_C)).toBeCloseTo(0.15985051256312477);
    });
  });

  describe('generating variances', () => {
    test('returns uniform variances with no preferences', () => {
      const ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });

      const pairs = ranker.select();

      // 3 items → 3 pairs
      expect(pairs).toHaveLength(3);

      // With pseudocount k=0.15, off-diagonal cells are 0.15
      // Beta(0.15 + 1, 0.15 + 1) = Beta(1.15, 1.15)
      // Variance = (a * b) / ((a + b + 1) * (a + b)^2)
      const a = 0.15 + 1;
      const b = 0.15 + 1;
      const expectedVar = (a * b) / ((a + b + 1) * (a + b) ** 2);

      for (const p of pairs) {
        expect(p.weight).toBeCloseTo(expectedVar);
      }
    });

    test('variances decrease with preferences', () => {
      const ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });

      const beforePairs = ranker.select();

      ranker.addPreferences([pref(ITEM_A, ITEM_B, 1)]);

      const afterPairs = ranker.select();

      // The A-B pair should have lower variance (more data)
      const abBefore = beforePairs.find(
        (p) => p.alpha === String(ITEM_A) && p.beta === String(ITEM_B)
      )!;
      const abAfter = afterPairs.find(
        (p) => p.alpha === String(ITEM_A) && p.beta === String(ITEM_B)
      )!;

      expect(abAfter.weight).toBeLessThan(abBefore.weight);
    });
  });

  describe('without pseudocounts', () => {
    test('strong preferences converge sharply without k', () => {
      const ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
      });

      ranker.addPreferences([pref(ITEM_A, ITEM_B, 1), pref(ITEM_B, ITEM_C, 1)]);

      const rankings = ranker.run();

      // Without pseudocounts, A absorbs nearly all weight
      expect(score(rankings, ITEM_A)).toBeCloseTo(0.99951171875);
      expect(score(rankings, ITEM_B)).toBeCloseTo(0.00048828125);
      expect(score(rankings, ITEM_C)).toBeCloseTo(0);
    });
  });

  describe('selecting pairs', () => {
    test('selects the requested number of pairs', () => {
      const ranker = new PowerRanker({ items: new Set(['1', '2', '3']) });
      const pairs = ranker.select({ num: 2 });
      expect(pairs).toHaveLength(2);
    });

    test('returns all pairs when num exceeds available', () => {
      const ranker = new PowerRanker({ items: new Set(['1', '2', '3']) });
      const pairs = ranker.select({ num: 10 });
      // 3 items → 3 pairs
      expect(pairs).toHaveLength(3);
    });

    test('selects without replacement', () => {
      // 5 items → 10 pairs; request 5 — must be unique
      const ranker = new PowerRanker({ items: new Set(['1', '2', '3', '4', '5']) });
      const pairs = ranker.select({ num: 5 });
      const keys = pairs.map((p) => pairKey(p.alpha, p.beta));
      expect(pairs).toHaveLength(5);
      expect(new Set(keys).size).toBe(5);
    });

    test('excludes specified pairs', () => {
      const ranker = new PowerRanker({ items: new Set(['1', '2', '3']) });
      const exclude = new Set(['1:2', '2:3']);
      const pairs = ranker.select({ num: 10, exclude });

      expect(pairs).toHaveLength(1);
      expect(pairs[0].alpha).toBe('1');
      expect(pairs[0].beta).toBe('3');
    });

    test('returns empty when all pairs excluded', () => {
      const ranker = new PowerRanker({ items: new Set(['1', '2', '3']) });
      const exclude = new Set(['1:2', '1:3', '2:3']);
      const pairs = ranker.select({ num: 5, exclude });
      expect(pairs).toHaveLength(0);
    });

    test('preferences shift which pairs are selected more often', () => {
      const ranker = new PowerRanker({ items: new Set(['a', 'b', 'c']) });

      // Strong preference for a over b — reduces a:b variance
      ranker.addPreferences([
        { target: 'a', source: 'b', value: 1 },
        { target: 'a', source: 'b', value: 1 },
        { target: 'a', source: 'b', value: 1 },
      ]);

      // Over many single-pair selections, a:b should appear least often
      const counts: Record<string, number> = { 'a:b': 0, 'a:c': 0, 'b:c': 0 };
      for (let i = 0; i < 1000; i++) {
        const [pair] = ranker.select({ num: 1 });
        counts[pairKey(pair.alpha, pair.beta)]++;
      }

      expect(counts['a:b']).toBeLessThan(counts['a:c']);
      expect(counts['a:b']).toBeLessThan(counts['b:c']);
    });

    test('exclude simulates judge-already-voted', () => {
      const ranker = new PowerRanker({ items: new Set(['a', 'b', 'c']) });

      const judgedPairs = new Set([pairKey('a', 'b'), pairKey('a', 'c')]);
      const pairs = ranker.select({ num: 10, exclude: judgedPairs });

      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toMatchObject({ alpha: 'b', beta: 'c' });
    });

    test('impact weighting prioritizes pairs between high-ranked items', () => {
      // Use pseudocounts so all items retain nonzero weight
      const ranker = new PowerRanker({ items: new Set(['a', 'b', 'c']), options: { k: K } });

      // Strong preference: a > b > c (clear hierarchy)
      ranker.addPreferences([
        { target: 'a', source: 'b', value: 1 },
        { target: 'b', source: 'c', value: 1 },
      ]);

      // With impact: a:b should be favored over b:c because a and b have higher weights

      const counts: Record<string, number> = { 'a:b': 0, 'a:c': 0, 'b:c': 0 };
      for (let i = 0; i < 1000; i++) {
        const [pair] = ranker.select({ num: 1, impact: ['weight'] });
        counts[pairKey(pair.alpha, pair.beta)]++;
      }

      // b:c involves the two lowest-ranked items, so should be selected least
      expect(counts['b:c']).toBeLessThan(counts['a:b']);
      expect(counts['b:c']).toBeLessThan(counts['a:c']);
    });

    test('impact weighting works with no preferences (uniform weights)', () => {
      const ranker = new PowerRanker({ items: new Set(['a', 'b', 'c']) });

      // With uniform weights, impact should behave like plain variance selection
      const pairs = ranker.select({ num: 3, impact: ['weight'] });
      expect(pairs).toHaveLength(3);
      const keys = pairs.map((p) => pairKey(p.alpha, p.beta));
      expect(new Set(keys).size).toBe(3);
    });

    test('coverage transform prioritizes under-observed items', () => {
      const ranker = new PowerRanker({ items: new Set(['a', 'b', 'c', 'd']) });

      // Heavily observe a and b (many preferences between them)
      for (let i = 0; i < 10; i++) {
        ranker.addPreferences([{ target: 'a', source: 'b', value: 1 }]);
      }

      const pairs = ranker.select({ impact: ['coverage'] });

      // Find pairs involving c:d (both unobserved) vs a:b (both heavily observed)
      const cd = pairs.find((p) => p.alpha === 'c' && p.beta === 'd')!;
      const ab = pairs.find((p) => p.alpha === 'a' && p.beta === 'b')!;

      // c:d should have higher weight — both items are unobserved
      expect(cd.weight).toBeGreaterThan(ab.weight);
    });

    test('even votes (0.5) reduce coverage weight without changing beta variance', () => {
      const ranker = new PowerRanker({ items: new Set(['a', 'b', 'c']) });

      // Get baseline weights with coverage
      const before = ranker.select({ impact: ['coverage'] });
      const abBefore = before.find((p) => p.alpha === 'a' && p.beta === 'b')!;

      // Add an "even" vote — score 0.5 contributes nothing to matrix but counts as observation
      ranker.addPreferences([{ target: 'a', source: 'b', value: 0.5 }]);

      const after = ranker.select({ impact: ['coverage'] });
      const abAfter = after.find((p) => p.alpha === 'a' && p.beta === 'b')!;

      // With coverage, weight should decrease (items now have observations)
      expect(abAfter.weight).toBeLessThan(abBefore.weight);

      // Without coverage, weight should be unchanged (0.5 adds nothing to beta)
      const afterPlain = ranker.select();
      const abPlain = afterPlain.find((p) => p.alpha === 'a' && p.beta === 'b')!;
      const beforePlain = before.find((p) => p.alpha === 'a' && p.beta === 'b')!;
      // Plain weights use only beta variance — account for the coverage factor in before
      // Just check the beta variance directly via getVariances (plain select)
      expect(abPlain.weight).toBeCloseTo(beforePlain.weight);
    });

    test('composable transforms apply multiplicatively', () => {
      const ranker = new PowerRanker({
        items: new Set(['a', 'b', 'c']),
        options: { k: K },
      });

      ranker.addPreferences([
        { target: 'a', source: 'b', value: 1 },
        { target: 'b', source: 'c', value: 1 },
      ]);

      const plain = ranker.select();
      const withWeight = ranker.select({ impact: ['weight'] });
      const withCoverage = ranker.select({ impact: ['coverage'] });
      const withBoth = ranker.select({ impact: ['weight', 'coverage'] });

      // All should return 3 pairs
      expect(plain).toHaveLength(3);
      expect(withWeight).toHaveLength(3);
      expect(withCoverage).toHaveLength(3);
      expect(withBoth).toHaveLength(3);

      // Combined weights should be strictly less than either single transform
      const abBoth = withBoth.find((p) => p.alpha === 'a' && p.beta === 'b')!;
      const abWeight = withWeight.find((p) => p.alpha === 'a' && p.beta === 'b')!;
      const abCoverage = withCoverage.find((p) => p.alpha === 'a' && p.beta === 'b')!;
      const abPlain = plain.find((p) => p.alpha === 'a' && p.beta === 'b')!;

      // Both transforms applied should produce smaller weight than either alone
      expect(abBoth.weight).toBeLessThan(abPlain.weight);
      expect(abBoth.weight).toBeLessThan(abWeight.weight);
      expect(abBoth.weight).toBeLessThan(abCoverage.weight);
    });
  });
});

describe('activeSelect', () => {
  test('returns all pairs when num is omitted', () => {
    const ranker = new PowerRanker({ items: makeItems(ITEM_A, ITEM_B, ITEM_C) });
    const pairs = ranker.activeSelect();
    expect(pairs).toHaveLength(3);
  });

  test('selects the requested number of pairs', () => {
    const ranker = new PowerRanker({ items: makeItems(ITEM_A, ITEM_B, ITEM_C) });
    const pairs = ranker.activeSelect({ num: 2 });
    expect(pairs).toHaveLength(2);
  });

  test('excludes specified pairs', () => {
    const ranker = new PowerRanker({ items: makeItems(ITEM_A, ITEM_B, ITEM_C) });
    const exclude = new Set([pairKey(String(ITEM_A), String(ITEM_B))]);
    const pairs = ranker.activeSelect({ num: 10, exclude });
    expect(pairs).toHaveLength(2);
    const keys = pairs.map((p) => pairKey(p.alpha, p.beta));
    expect(keys).not.toContain(pairKey(String(ITEM_A), String(ITEM_B)));
  });

  test('with no data, all pairs have equal weight (uniform positions)', () => {
    const ranker = new PowerRanker({
      items: makeItems(ITEM_A, ITEM_B, ITEM_C),
      options: { k: K },
    });
    const pairs = ranker.activeSelect();
    // With uniform rankings, positions are arbitrary but deterministic.
    // All weights should be positive.
    for (const p of pairs) {
      expect(p.weight).toBeGreaterThan(0);
    }
  });

  test('coverage prioritizes unobserved entries', () => {
    const ranker = new PowerRanker({
      items: new Set(['a', 'b', 'c', 'd']),
      options: { k: K },
    });

    // Heavily observe a and b
    for (let i = 0; i < 10; i++) {
      ranker.addPreferences([{ target: 'a', source: 'b', value: 1 }]);
    }

    const pairs = ranker.activeSelect({ terms: ['coverage'] });
    const cd = pairs.find((p) => p.alpha === 'c' && p.beta === 'd')!;
    const ab = pairs.find((p) => p.alpha === 'a' && p.beta === 'b')!;

    expect(cd.weight).toBeGreaterThan(ab.weight);
  });

  test('proximity prioritizes close-ranked pairs', () => {
    const ranker = new PowerRanker({
      items: new Set(['a', 'b', 'c', 'd']),
      options: { k: K },
    });

    // Clear hierarchy: a > b > c > d
    ranker.addPreferences([
      { target: 'a', source: 'b', value: 1 },
      { target: 'b', source: 'c', value: 1 },
      { target: 'c', source: 'd', value: 1 },
    ]);

    const pairs = ranker.activeSelect({ terms: ['proximity'] });
    const adjacent = pairs.find((p) => p.alpha === 'a' && p.beta === 'b')!;
    const distant = pairs.find((p) => p.alpha === 'a' && p.beta === 'd')!;

    expect(adjacent.weight).toBeGreaterThan(distant.weight);
  });

  test('position prioritizes high-ranked pairs', () => {
    const ranker = new PowerRanker({
      items: new Set(['a', 'b', 'c', 'd']),
      options: { k: K },
    });

    // Clear hierarchy: a > b > c > d
    ranker.addPreferences([
      { target: 'a', source: 'b', value: 1 },
      { target: 'b', source: 'c', value: 1 },
      { target: 'c', source: 'd', value: 1 },
    ]);

    const pairs = ranker.activeSelect({ terms: ['position'] });
    const top = pairs.find((p) => p.alpha === 'a' && p.beta === 'b')!;
    const bottom = pairs.find((p) => p.alpha === 'c' && p.beta === 'd')!;

    expect(top.weight).toBeGreaterThan(bottom.weight);
  });

  test('combined terms shift attention toward top close pairs', () => {
    const ranker = new PowerRanker({
      items: new Set(['a', 'b', 'c', 'd', 'e']),
      options: { k: K },
    });

    // a > b > c > d > e
    ranker.addPreferences([
      { target: 'a', source: 'b', value: 1 },
      { target: 'b', source: 'c', value: 1 },
      { target: 'c', source: 'd', value: 1 },
      { target: 'd', source: 'e', value: 1 },
    ]);

    const pairs = ranker.activeSelect();

    // a:b (adjacent, top-ranked) should beat d:e (adjacent, bottom-ranked)
    const ab = pairs.find((p) => p.alpha === 'a' && p.beta === 'b')!;
    const de = pairs.find((p) => p.alpha === 'd' && p.beta === 'e')!;
    expect(ab.weight).toBeGreaterThan(de.weight);

    // a:b (adjacent, top) should beat a:e (distant, involves top)
    const ae = pairs.find((p) => p.alpha === 'a' && p.beta === 'e')!;
    expect(ab.weight).toBeGreaterThan(ae.weight);
  });

  test('r=0 produces uniform weights regardless of terms', () => {
    const ranker = new PowerRanker({
      items: new Set(['a', 'b', 'c', 'd']),
      options: { k: K },
    });

    // Create uneven observations and clear hierarchy
    for (let i = 0; i < 10; i++) {
      ranker.addPreferences([{ target: 'a', source: 'b', value: 1 }]);
    }

    const pairs = ranker.activeSelect({ r: 0 });
    const weights = pairs.map((p) => p.weight);
    for (const w of weights) {
      expect(w).toBeCloseTo(1);
    }
  });

  test('r<1 compresses weights toward uniform via power transform', () => {
    const ranker = new PowerRanker({
      items: new Set(['a', 'b', 'c', 'd']),
      options: { k: K },
    });

    for (let i = 0; i < 10; i++) {
      ranker.addPreferences([{ target: 'a', source: 'b', value: 1 }]);
    }

    const fullPairs = ranker.activeSelect({ r: 1 });
    const halfPairs = ranker.activeSelect({ r: 0.5 });

    // With power transform, r=0.5 brings all weights closer to 1 (uniform).
    // The max/min ratio should be smaller.
    const ratio = (pairs: typeof fullPairs) => {
      const ws = pairs.map((p) => p.weight);
      return Math.max(...ws) / Math.min(...ws);
    };
    expect(ratio(halfPairs)).toBeLessThan(ratio(fullPairs));
    expect(ratio(halfPairs)).toBeGreaterThan(1);
  });
});

describe('pairKey', () => {
  test('returns canonical sorted key', () => {
    expect(pairKey('a', 'b')).toBe('a:b');
    expect(pairKey('b', 'a')).toBe('a:b');
    expect(pairKey('10', '2')).toBe('10:2');
  });
});
