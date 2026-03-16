# Ranking Weight Recovery Analysis

Results from `simulate-ranker.ts` exploring how well the spectral ranker recovers true item weights from pairwise comparisons.

## Setup

- 30 items with power-law weights `w_i = ((i+1)/n)^alpha`, normalized.
- Pairs selected via `activeSelect` with coverage, proximity, and position terms (r=0.9).
- Votes drawn from Bradley-Terry: `P(A>B) = wA / (wA + wB)`, with noise=0.3 and 5-level Likert binning.
- Prior: `k = C / n` with C=1.
- Each trial runs judges × sessions × sessionSize votes, giving `votes / items` comparisons per item (vpi).
- 80 trials per configuration.

## Algorithm

**Bidirectional linear flow** with column-sum self-loops.

Each vote with score s adds `s` flow toward the preferred item and `(1-s)` toward the other.
Before row-normalization, each item's diagonal is set to its column sum (total incoming flow), which lets items retain weight proportional to how much others prefer them.

This satisfies detailed balance: with exact Bradley-Terry probabilities and no prior, the stationary distribution is provably proportional to true weights.

## Recovery Results (Likert, noise=0.3, C=1)

Three distribution shapes tested:

- **alpha=0.5** (flat): true spread 5.5x between best and worst item.
- **alpha=1.0** (medium): true spread 30x.
- **alpha=1.5** (steep): true spread 164x.

### Ordinal accuracy (Spearman rank correlation)

| vpi | alpha=0.5 | alpha=1.0 | alpha=1.5 |
| --- | --------- | --------- | --------- |
| 12  | 0.87      | 0.95      | 0.98      |
| 24  | 0.94      | 0.98      | 0.99      |
| 36  | 0.95      | 0.99      | 0.99      |

Ordering is reliable across all distribution shapes.
Steeper distributions are easier to rank because the quality gaps between items are larger.

### Cardinal accuracy (spread ratio: recovered/true, 1.0 = perfect)

| vpi | alpha=0.5 | alpha=1.0 | alpha=1.5 |
| --- | --------- | --------- | --------- |
| 12  | 2.40x     | 1.26x     | 0.40x     |
| 24  | 2.79x     | 1.72x     | 0.62x     |
| 36  | 2.79x     | 1.92x     | 0.79x     |

No single configuration recovers magnitudes for all distributions:

- **Flat** (alpha=0.5): over-dispersed (~2.4–2.8x).
  Likert noise on close pairs creates spurious strong signals.
- **Medium** (alpha=1.0): reasonably close at 12 vpi (1.26x), drifts over-dispersed with more data.
- **Steep** (alpha=1.5): under-dispersed.
  The linear [0,1] Likert scale cannot represent the true 164x weight ratio.

### Pearson correlation and L2 error

| vpi | Pearson (0.5/1.0/1.5) | L2 error (0.5/1.0/1.5) |
| --- | --------------------- | ---------------------- |
| 12  | 0.82 / 0.90 / 0.94    | 0.061 / 0.060 / 0.057  |
| 24  | 0.88 / 0.94 / 0.96    | 0.057 / 0.054 / 0.054  |
| 36  | 0.90 / 0.95 / 0.96    | 0.054 / 0.053 / 0.052  |

### Pair coverage

| vpi | Judges | Pairs observed | Coverage |
| --- | ------ | -------------- | -------- |
| 12  | 12     | 228/435        | 52%      |
| 24  | 24     | 318/435        | 73%      |
| 36  | 36     | 363/435        | 83%      |

The ranker correctly infers ordering for unobserved pairs through transitive flow in the Markov chain.

## The Bias-Variance Dilemma

With Likert binning, you can recover **ordering** but not **exact magnitudes** — and more data does not fix this.

Likert binning introduces systematic magnitude **bias** that does not average out with more votes:

- **Close pairs** (flat distributions, true p ≈ 0.52): most votes bin to 0.5 (zero signal), but the rest bin to 0.75 or 0.25 — far stronger than the true 0.02 difference.
  More data gives more of these over-strong signals → over-dispersion persists.
- **Distant pairs** (steep distributions, true p ≈ 0.9): votes bin to 0.75 or 1.0, systematically compressing the true signal.
  More data gives more compressed signals → under-dispersion shrinks slowly but cannot recover the full spread.

This is Jensen's inequality: Likert binning is a nonlinear step function, and `E[bin(p + noise)] ≠ bin(E[p + noise])`.
More votes reduce **variance** (ordering improves) but not **bias** (magnitudes stay distorted).

Tested at extreme vote counts (up to 1000 vpi), spread ratio converges to a stable but incorrect value rather than to 1.0:

| vpi  | alpha=0.5 | alpha=1.0 | alpha=1.5 |
| ---- | --------- | --------- | --------- |
| 12   | 2.40x     | 1.26x     | 0.40x     |
| 100  | 3.05x     | 2.45x     | 1.19x     |
| 1000 | 3.20x     | 2.70x     | 1.53x     |

The spread plateaus around 3.2x (flat), 2.7x (medium), and 1.5x (steep).
This is stable — unlike the old differential flow which diverged unboundedly — but does not converge to truth.

Two things can help:

1. **Known distribution shape** → fit a parametric model (e.g. power law) to the recovered ordering and estimate magnitudes from the shape parameter.
2. **Finer scoring scale** → reduces the binning bias directly.
   Continuous scoring shows modest improvement (tested at 12 vpi: spread 2.13x vs 2.40x for alpha=0.5).

## Implications for Game Jam Judging

At our target of 12 vpi (12 judges, 3 sessions of 10 votes each):

- **Rankings are reliable**: Spearman 0.87–0.98 depending on how differentiated the entries are.
- **Funding by weight is approximate**: works well if the true quality distribution is moderate (alpha ~1.0, spread ratio 1.26x), but will over-spread funding for flat fields and under-spread for steep ones.
- **More votes improve ordering** (24 vpi: Spearman 0.94–0.99) but do not resolve the magnitude bias — this is a property of Likert binning, not sample size.

## Configuration

| Parameter  | Value                | Rationale                                                            |
| ---------- | -------------------- | -------------------------------------------------------------------- |
| Prior C    | 1                    | k = C/n; best spread recovery for medium distributions at 12 vpi     |
| Flow       | Linear bidirectional | Score s → s to preferred, (1-s) to other; satisfies detailed balance |
| Self-loops | Column sums          | d[i][i] = colSum[i]; items retain weight proportional to preference  |
| Scoring    | 5-level Likert       | {0, 0.25, 0.5, 0.75, 1.0}; bounded and discrete                      |
| Noise      | 0.3                  | Uniform noise amplitude on BT probability before binning             |

## Open Research Questions

1. **Adaptive prior**: Could C be tuned based on observed vote density or spread, rather than fixed at 1?
   A data-driven prior might improve magnitude recovery across distribution shapes.

2. **Post-hoc parametric fitting**: Given recovered ordering + approximate weights, fit a power-law curve to estimate the true shape parameter alpha.
   This would convert ordinal accuracy into better cardinal estimates.

3. **Finer scoring granularity**: Would a 7- or 9-point scale meaningfully improve magnitude recovery?
   Our continuous-scoring tests show only modest improvement, suggesting binning is not the only bottleneck.

4. **Hybrid scoring**: Could a coarse Likert scale for most pairs be combined with a fine-grained "calibration" comparison for a few pairs to anchor the scale?

5. **Confidence weighting**: Judges vary in reliability.
   Weighting votes by judge consistency (e.g. internal transitivity) could reduce noise without requiring more votes.

6. **Self-loop alternatives**: Column sums cause mild ordering inversions in sparse graphs (3 items, 2 votes).
   This vanishes at scale, but a principled alternative for small n would strengthen the algorithm's theoretical foundation.
