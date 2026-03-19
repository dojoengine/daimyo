# PowerRanker

PageRank-style spectral ranker with active pair selection.
Ported from [zaratanDotWorld/choreWheel](https://github.com/zaratanDotWorld/choreWheel) `src/lib/power.js`, rewritten in TypeScript using [ml-matrix](https://github.com/mljs/matrix).

## How it works

### Ranking

Pairwise preferences are accumulated into an N×N matrix using bidirectional encoding: a score `s` adds `s` to `matrix[source][target]` and `1-s` to `matrix[target][source]`.
This means every observation informs both items — a strong preference (s=1) flows entirely toward the winner, while an even vote (s=0.5) splits equally.

The diagonal holds each item's total received preference (column sum), making it a self-reinforcing signal.
The matrix is row-normalized into a stochastic matrix, then power iteration finds the dominant eigenvector — the stationary distribution that becomes the ranking.

Optional Bayesian pseudocounts (`k`) initialize off-diagonal cells, regularizing the matrix when data is sparse.

### Active pair selection

`activeSelect()` chooses which pairs to present next using three composable signals:

- **coverage** (`1/√(1+n_i) × 1/√(1+n_j)`) — dominates early when observations are sparse.
- **proximity** (`1/(1+|pos_i-pos_j|)`) — favors pairs that are close in rank.
- **position** (`1/√(pos_i×pos_j)`) — favors pairs near the top of the ranking.

A regularization parameter `r` (0–1) controls how strongly these signals influence selection via a power transform.
At `r=0`, selection is uniform; at `r=1` (default), the full weighting applies.

## API

```typescript
const ranker = new PowerRanker({
  items: new Set(['a', 'b', 'c']),
  options: { k: 0.15 }, // optional pseudocount
});

// Add pairwise preferences (value: 0 = prefer source, 0.5 = neutral, 1 = prefer target)
ranker.addPreferences([
  { target: 'a', source: 'b', value: 0.8 },
  { target: 'b', source: 'c', value: 0.6 },
]);

// Get rankings (Map<string, number>, values sum to 1)
const rankings = ranker.run();

// Get all pairs with their selection weights
const allPairs = ranker.activeSelect();

// Select pairs for a judging session (weighted sampling without replacement)
const pairs = ranker.activeSelect({
  num: 5,
  exclude: new Set(['a:b']), // pairs already judged
  terms: ['coverage', 'proximity', 'position'], // default: all three
  r: 0.9, // regularization strength
});
```

## Files

- `PowerRanker.ts` — Implementation
- `PowerRanker.test.ts` — Tests
- `index.ts` — Re-exports
