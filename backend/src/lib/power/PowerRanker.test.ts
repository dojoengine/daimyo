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
      // Slightly prefer A over B, and B over C.
      // B edges above A because bidirectional flow gives B incoming data from both
      // neighbors (reverse flow from A + forward flow from C), while A only receives
      // from B. This sparse-graph artifact vanishes at scale with dense observations.
      const ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });

      ranker.addPreferences([pref(ITEM_A, ITEM_B, 0.7), pref(ITEM_B, ITEM_C, 0.7)]);

      let rankings = ranker.run();

      expect(score(rankings, ITEM_A)).toBeCloseTo(0.4068951041201312);
      expect(score(rankings, ITEM_B)).toBeCloseTo(0.4166002074347627);
      expect(score(rankings, ITEM_C)).toBeCloseTo(0.17650468844510636);

      // Adding the transitive edge A>C completes the triangle and restores correct ordering
      ranker.addPreferences([pref(ITEM_A, ITEM_C, 0.7)]);
      rankings = ranker.run();

      expect(score(rankings, ITEM_A)).toBeCloseTo(0.48552824664847594);
      expect(score(rankings, ITEM_B)).toBeCloseTo(0.30516609377264914);
      expect(score(rankings, ITEM_C)).toBeCloseTo(0.20930565957887504);
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
      // B edges above A because B's decisive victory (1.0 over C) outweighs A's mild win (0.7 over B)
      ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });
      ranker.addPreferences([pref(ITEM_A, ITEM_B, 0.7), pref(ITEM_B, ITEM_C, 1)]);
      rankings = ranker.run();
      expect(score(rankings, ITEM_A)).toBeCloseTo(0.43753649364391556);
      expect(score(rankings, ITEM_B)).toBeCloseTo(0.4780745171818418);
      expect(score(rankings, ITEM_C)).toBeCloseTo(0.08438898917424287);

      // Scenario 3: soften both to 0.7
      ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
        options: { k: K },
      });
      ranker.addPreferences([pref(ITEM_A, ITEM_B, 0.7), pref(ITEM_B, ITEM_C, 0.7)]);
      rankings = ranker.run();
      expect(score(rankings, ITEM_A)).toBeCloseTo(0.4068951041201312);
      expect(score(rankings, ITEM_B)).toBeCloseTo(0.4166002074347627);
      expect(score(rankings, ITEM_C)).toBeCloseTo(0.17650468844510636);
    });
  });

  describe('without pseudocounts', () => {
    test('strong preferences converge sharply without k', () => {
      const ranker = new PowerRanker({
        items: makeItems(ITEM_A, ITEM_B, ITEM_C),
      });

      ranker.addPreferences([pref(ITEM_A, ITEM_B, 1), pref(ITEM_B, ITEM_C, 1)]);

      const rankings = ranker.run();

      // Without pseudocounts, A absorbs nearly all weight.
      // B retains a trace from beating C, but leaks to absorbing-state A each iteration.
      expect(score(rankings, ITEM_A)).toBeCloseTo(0.99951171875, 10);
      expect(score(rankings, ITEM_B)).toBeCloseTo(0.00048828125, 10);
      expect(score(rankings, ITEM_C)).toBeCloseTo(0, 10);
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
