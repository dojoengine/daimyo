# PowerRanker

PageRank-style spectral ranker with active pair selection.
Ported from [zaratanDotWorld/choreWheel](https://github.com/zaratanDotWorld/choreWheel) `src/lib/power.js`, rewritten in TypeScript using [ml-matrix](https://github.com/mljs/matrix).

## How it works

### Ranking

Pairwise preferences are accumulated into an N×N matrix where `matrix[i][j]` represents the strength of preference for item j over item i.
Preferences are scaled from the input range [0, 1] to [-1, 1] centered at 0.5 (no preference).

The diagonal holds each item's total received preference (column sum), making it a self-reinforcing signal.
The matrix is row-normalized into a stochastic matrix, then power iteration finds the dominant eigenvector — the stationary distribution that becomes the ranking.

Optional Bayesian pseudocounts (`k`) initialize off-diagonal cells, regularizing the matrix when data is sparse.

### Active pair selection

`select()` chooses which pairs to present next using variance-weighted sampling without replacement.
Each pair's uncertainty is modeled as a Beta distribution: `Beta(matrix[i][j] + 1, matrix[j][i] + 1)`.
Higher variance means less certainty about the relative ranking — so those pairs are sampled more often.

With `impact: true`, the variance is multiplied by `weight_a * weight_b` (the eigenvector scores), prioritizing uncertain pairs between high-ranked items.

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

// Get all pairs with their variance weights
const allPairs = ranker.select();

// Select pairs for a judging session (weighted sampling without replacement)
const pairs = ranker.select({
  num: 5,
  exclude: new Set(['a:b']), // pairs already judged
  impact: true, // weight by item importance
});
```

## Files

- `PowerRanker.ts` — Implementation
- `PowerRanker.test.ts` — Tests (20 cases)
- `index.ts` — Re-exports
