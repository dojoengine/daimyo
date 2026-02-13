import type { Entry } from './entries.js';

export const DUMMY_ENTRIES: Record<string, Entry[]> = {
  gj7: [
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
    {
      id: '63',
      emoji: '\uD83C\uDFCE\uFE0F',
      title: 'Cairo Kart',
      summary_short:
        'Racing game with on-chain leaderboards, NFT vehicles, and verifiable race results. Designed for mobile play with Cartridge Controller.',
      summary_long:
        'Players compete on procedurally generated tracks, each with unique elevation changes, turns, and hazards. Every vehicle has stats stored as Dojo models — speed, acceleration, handling, and drift — that meaningfully affect race performance. Race results are computed on-chain using Cairo contracts, preventing cheating. A tournament system lets players stake tokens to enter brackets, with winners taking the pot. A replay system re-executes recorded inputs through the deterministic simulation, allowing spectators to verify any result independently. The React UI is optimized for touch controls with Cartridge Controller for seamless wallet interaction.',
      work_done_short:
        'Built entirely during the jam. Track generation, vehicle physics, and race result verification all implemented in Cairo. Mobile-first React frontend with Cartridge Controller integration.',
      work_done_long:
        "Track generation uses seed-based procedural algorithms to create unique circuits with varying elevation, turns, and hazards. Vehicle physics model acceleration, drift, and collisions with deterministic computation for verifiable results. Each vehicle's stats are stored as Dojo models. The tournament system handles entry staking, bracket generation, and prize distribution. A replay system re-executes recorded inputs for independent race verification.",
      repo_url: 'https://github.com/example/cairo-kart',
      demo_url: 'https://kart.example.com',
      video_url: 'https://youtube.com/watch?v=def456',
      team: ['@kartmaster', '@trackdesigner', '@uibuilder'],
      metrics: {
        classification: 'Whole Game',
        team_size: 3,
        dojo_contracts: '5 models, 6 systems',
        jam_commits_pct: 92,
        playability: 'Live',
      },
    },
    {
      id: '71',
      emoji: '\u2694\uFE0F',
      title: 'Blockchain Battlers',
      summary_short:
        'Turn-based strategy game with verifiable randomness and on-chain tournaments. Features 7 unique hero classes with distinct skill trees.',
      summary_long:
        'Players command squads in tactical combat, choosing from offensive, defensive, and support abilities across branching skill trees. Combat uses VRF for critical hits and evasion, ensuring provably fair outcomes. Three difficulty levels unlock sequentially, each scaling enemy stats and AI behavior. An on-chain progression system tracks XP, unlocked skills, and win/loss records. Tournament mode supports bracket-style elimination with token staking, ranked by win streaks and performance metrics. Rich pixel-art animations accompany every action, with 11 unique sound effects for immersive combat feedback. All game state syncs in real-time via Torii.',
      work_done_short:
        'Built from scratch. All 7 hero classes, skill trees, turn-based combat with VRF, progression system, and tournament mode implemented during the jam.',
      work_done_long:
        'Each hero class features a branching skill tree with 4-6 unlockable abilities spanning offensive, defensive, and support roles. Combat uses verifiable random functions for critical hits, dodge chances, and ability proc rates. The progression system tracks XP, unlocked skills, and win/loss records on-chain. Three difficulty tiers unlock sequentially. Pixel art sprites and 11 unique sound effects were created by a team member for combat feedback.',
      repo_url: 'https://github.com/example/blockchain-battlers',
      demo_url: 'https://battlers.example.com',
      team: ['@battlerdev', '@artpixel'],
      metrics: {
        classification: 'Whole Game',
        team_size: 2,
        dojo_contracts: '8 models, 5 systems',
        jam_commits_pct: 88,
        playability: 'Live',
      },
    },
    {
      id: '85',
      emoji: '\uD83E\uDD95',
      title: 'Crypto Creatures',
      summary_short:
        'Collect, breed, and battle creatures with provably fair genetics. Each creature is a unique on-chain entity with inherited traits.',
      summary_long:
        'The breeding algorithm uses Cairo-based genetic simulation with dominant and recessive traits across 8 categories — elemental type, size, coloring, and stat distributions. Offspring inherit traits probabilistically, making each creature genuinely unique. The turn-based battle system features 5 elemental types with rock-paper-scissors advantages and special moves that unlock at level thresholds. Creatures gain XP from battles and strengthen inherited traits as they level up. All creature data is stored as Dojo models with computed stats derived from genetics. No live deployment yet, but a comprehensive video walkthrough demonstrates every mechanic end to end.',
      work_done_short:
        'Built from scratch by a solo developer. Genetic breeding algorithm, creature models, battle system, and type advantages all implemented in Cairo. Frontend uses vanilla JS and HTML canvas.',
      work_done_long:
        'The breeding algorithm simulates dominant and recessive gene inheritance across 8 trait categories including elemental type, size, coloring, and stat distributions. Each creature is a unique on-chain entity with computed stats derived from its genetic makeup. The battle system features 5 elemental types with a rock-paper-scissors advantage matrix and special moves that unlock at level thresholds. No live deployment; a comprehensive video walkthrough demonstrates all mechanics.',
      repo_url: 'https://github.com/example/crypto-creatures',
      video_url: 'https://youtube.com/watch?v=ghi789',
      team: ['@creaturemaster'],
      metrics: {
        classification: 'Whole Game',
        team_size: 1,
        dojo_contracts: '10 models, 7 systems',
        jam_commits_pct: 97,
        playability: 'Video',
      },
    },
    {
      id: '92',
      emoji: '\uD83C\uDFD5\uFE0F',
      title: 'Stark Survival',
      summary_short:
        'Multiplayer survival game where resources and territory are on-chain. Harvest, craft, and defend your base against other players.',
      summary_long:
        'Players spawn into a shared hex-grid world, harvesting resources from the environment to craft tools, weapons, and building components. The territory system tracks hex ownership through smart contracts, with each hex containing resources that regenerate over time. Base building lets players claim hexes, place defensive structures, and establish resource-generating improvements. Combat is real-time with cooldown-based abilities, range calculations, and area-of-effect attacks. Seasonal events periodically alter resource distribution and introduce special challenges. Currently playable only via local setup — clone the repo, start Katana, deploy with Sozo, and run the React client.',
      work_done_short:
        'Built from scratch. Resource harvesting, crafting, hex-grid territory, base building, and real-time combat all implemented during the jam. React frontend with Dojo SDK.',
      work_done_long:
        'The hex-grid world stores terrain types and ownership in Dojo models, with each hex containing harvestable resources that regenerate over time. The crafting system supports 15 recipes combining raw materials into tools, weapons, and building components. Base building allows players to claim hexes and place defensive structures. Real-time combat uses cooldown-based abilities with range and area-of-effect calculations. No hosted deployment yet — playable via local Katana setup only.',
      repo_url: 'https://github.com/example/stark-survival',
      team: ['@survivalcoder', '@worldbuilder', '@combatdev'],
      metrics: {
        classification: 'Whole Game',
        team_size: 3,
        dojo_contracts: '12 models, 9 systems',
        jam_commits_pct: 85,
        playability: 'None',
      },
    },
  ],
};
