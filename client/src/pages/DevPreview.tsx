import { useState } from 'react';
import { Entry } from '../hooks/useJudging';
import { formatJamTitle } from '../utils/jam';
import ComparisonView from '../components/ComparisonView';
import ProgressBar from '../components/ProgressBar';
import './Judge.css';

const DUMMY_ENTRIES: Entry[] = [
  {
    id: '42',
    emoji: '\u265F',
    title: 'On-Chain Chess',
    summary_short:
      'A fully on-chain chess engine built with Dojo. Play PvP or PvC chess where every move is a verifiable transaction on Starknet, with spectator prediction staking.',
    summary_long:
      'All standard rules are supported — castling, en passant, pawn promotion, and threefold repetition draws — with each move validated by Cairo contracts before execution. Game state is serialized across 4 Dojo models, allowing players to resume matches across sessions. The PvC mode uses a minimax algorithm with adjustable difficulty. Spectators can stake tokens on match outcomes, with payouts based on prediction timing and accuracy, blending chess strategy with DeFi incentives. The React frontend connects via the Dojo SDK with smooth piece animations, move history, and real-time board updates through Torii indexing.',
    work_done_short:
      'Built from scratch during the jam. Full chess engine in Cairo with move validation, check/checkmate detection, and game state serialization across 4 models and 3 systems.',
    work_done_long:
      'The engine handles all standard rules including castling, en passant, and pawn promotion, with each move validated on-chain before execution. Game state serialization allows resuming matches across sessions. A spectator staking system lets viewers predict outcomes and earn rewards. The React frontend uses the Dojo SDK for real-time board updates via Torii.',
    repo_url: 'https://github.com/example/stark-chess',
    demo_url: 'https://chess.example.com',
    video_url: 'https://youtube.com/watch?v=abc123',
    team: ['@morelucks', '@Itodo-S'],
    metrics: {
      classification: 'Whole Game',
      team_size: 2,
      dojo_contracts: '4 models, 3 systems',
      jam_commits_pct: 95,
      playability: 'Live',
    },
  },
  {
    id: '57',
    emoji: '\uD83D\uDC09',
    title: 'Dojo Dungeon',
    summary_short:
      'Roguelike dungeon crawler with procedurally generated levels, permadeath, and on-chain loot. Built as a new feature for an existing exploration game.',
    summary_long:
      'Players explore randomized dungeons floor by floor, battling monsters and collecting loot — all verified on-chain through Dojo smart contracts. Death means losing all unbanked items, creating high-stakes decisions about when to push deeper versus banking your haul. A combo scoring system rewards aggressive play with damage multipliers, and a global leaderboard tracks the deepest runs. The dungeon generation algorithm runs entirely in Cairo, ensuring provably fair room layouts, enemy placements, and loot drops. The Phaser.js client connects to the Dojo world via the TypeScript SDK.',
    work_done_short:
      'Added dungeon crawling to an existing exploration game. Jam work: procedural dungeon generation in Cairo, permadeath mechanics, and a loot system. Base game world and frontend pre-existed.',
    work_done_long:
      'The procedural generation algorithm creates randomized floor layouts with varying room sizes, corridors, and enemy placements — all computed in Cairo for provable fairness. Permadeath wipes unbanked inventory on death, creating high-stakes exploration. Loot drops scale with dungeon depth and include stat-boosting equipment stored as Dojo models. The existing Phaser.js frontend was extended with dungeon rendering, fog of war, and a minimap.',
    repo_url: 'https://github.com/example/dojo-dungeon',
    demo_url: 'https://dungeon.example.com',
    team: ['@dungeondev'],
    metrics: {
      classification: 'Feature',
      team_size: 1,
      dojo_contracts: '6 models, 4 systems',
      jam_commits_pct: 78,
      playability: 'Live',
    },
  },
];

export default function DevPreview() {
  const [pairIndex, setPairIndex] = useState(0);
  const pairs = [[0, 1]];
  const [a, b] = pairs[pairIndex % pairs.length];

  return (
    <div className="judge-page">
      <header className="judge-header">
        <div className="judge-header-left">
          <span className="judge-home-link">Daimyo</span>
          <h1 className="judge-title">{formatJamTitle('gj7')} Judging</h1>
        </div>
        <div className="judge-user">
          <span>dev-preview</span>
        </div>
      </header>

      <div className="judge-divider" />

      <ProgressBar completed={3} total={10} />

      <ComparisonView
        entryA={DUMMY_ENTRIES[a]}
        entryB={DUMMY_ENTRIES[b]}
        canGoBack={pairIndex > 0}
        onScore={() => setPairIndex((i) => i + 1)}
        onInvalidPair={() => setPairIndex((i) => i + 1)}
        onBack={() => setPairIndex((i) => Math.max(0, i - 1))}
      />
    </div>
  );
}
