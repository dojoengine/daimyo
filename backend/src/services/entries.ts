export interface EntryMetrics {
  classification: 'Whole Game' | 'Feature';
  team_size: number;
  dojo_contracts: string;
  frontend_sdk: boolean;
  jam_commits_pct: number;
  playability: 'Live' | 'Video' | 'Local';
}

export interface Entry {
  id: string;
  title: string;
  summary_short: string;
  summary_long: string;
  repo_url: string;
  demo_url?: string;
  video_url?: string;
  team: string[];
  metrics: EntryMetrics;
}

// Dummy entries for local testing
const DUMMY_ENTRIES: Record<string, Entry[]> = {
  gj7: [
    {
      id: '42',
      title: 'On-Chain Chess',
      summary_short:
        'A fully on-chain chess engine built with Dojo. Play PvP or PvC chess where every move is a verifiable transaction on Starknet, with spectator prediction staking.',
      summary_long:
        'StarkChess is a fully on-chain chess experience built on Starknet, powered by the Dojo Engine and integrated with Cartridge for seamless gameplay. It transforms traditional chess into a game of trust, value, and verifiable skill, where every move and decision is recorded on-chain. Players can compete in PvP or PvC modes, with all actions being transparent and immutable. Beyond gameplay, Spectator Prediction Staking lets users stake tokens on match outcomes, blending chess strategy with DeFi incentives. The game features a sleek interface built with React and the Dojo SDK, complete with move validation, game state persistence, and real-time updates via Torii indexing.',
      repo_url: 'https://github.com/example/stark-chess',
      demo_url: 'https://chess.example.com',
      video_url: 'https://youtube.com/watch?v=abc123',
      team: ['@morelucks', '@Itodo-S'],
      metrics: {
        classification: 'Whole Game',
        team_size: 2,
        dojo_contracts: '4 models, 3 systems',
        frontend_sdk: true,
        jam_commits_pct: 95,
        playability: 'Live',
      },
    },
    {
      id: '57',
      title: 'Dojo Dungeon',
      summary_short:
        'Roguelike dungeon crawler with procedurally generated levels, permadeath, and on-chain loot. Built as a new feature for an existing exploration game.',
      summary_long:
        'Dojo Dungeon is a roguelike dungeon crawler that brings procedurally generated levels to the blockchain. Players explore randomized dungeons, battle monsters, and collect loot — all verified on-chain through Dojo smart contracts. The game features permadeath mechanics where death means losing all unbanked items, creating high-stakes gameplay. A combo scoring system rewards skilled play, and a global leaderboard tracks the best dungeon delvers. The dungeon generation algorithm runs entirely in Cairo, ensuring provably fair level layouts. The client is built with Phaser.js and connects to the Dojo world via the TypeScript SDK.',
      repo_url: 'https://github.com/example/dojo-dungeon',
      demo_url: 'https://dungeon.example.com',
      team: ['@dungeondev'],
      metrics: {
        classification: 'Feature',
        team_size: 1,
        dojo_contracts: '6 models, 4 systems',
        frontend_sdk: true,
        jam_commits_pct: 78,
        playability: 'Live',
      },
    },
    {
      id: '63',
      title: 'Cairo Kart',
      summary_short:
        'Racing game with on-chain leaderboards, NFT vehicles, and verifiable race results. Designed for mobile play with Cartridge Controller.',
      summary_long:
        'Cairo Kart is a fast-paced racing game where players compete on procedurally generated tracks with NFT vehicles. Each vehicle has unique stats stored as Dojo models — speed, acceleration, handling, and drift. Race results are computed on-chain using Cairo contracts, ensuring verifiable outcomes and preventing cheating. The game features a tournament system where players stake tokens to enter and winners take the pot. A replay system lets spectators verify any race by re-running the inputs through the deterministic simulation. The mobile-first UI is built with React and optimized for touch controls, using Cartridge Controller for seamless wallet interaction.',
      repo_url: 'https://github.com/example/cairo-kart',
      demo_url: 'https://kart.example.com',
      video_url: 'https://youtube.com/watch?v=def456',
      team: ['@kartmaster', '@trackdesigner', '@uibuilder'],
      metrics: {
        classification: 'Whole Game',
        team_size: 3,
        dojo_contracts: '5 models, 6 systems',
        frontend_sdk: true,
        jam_commits_pct: 92,
        playability: 'Live',
      },
    },
    {
      id: '71',
      title: 'Blockchain Battlers',
      summary_short:
        'Turn-based strategy game with verifiable randomness and on-chain tournaments. Features 7 unique hero classes with distinct skill trees.',
      summary_long:
        'Blockchain Battlers is a turn-based strategy game where players command squads of heroes in tactical combat. Each of the 7 hero classes has a unique skill tree with offensive, defensive, and support abilities. Combat uses verifiable random functions for critical hits and evasion, ensuring fair outcomes. The game features three difficulty levels that unlock sequentially, an on-chain progression system, and rich pixel-art animations for every action. Players can enter tournaments by staking tokens, with rankings determined by win streaks and performance metrics. All game state is stored in Dojo models and synced in real-time via Torii, with 11 unique sound effects for immersive gameplay.',
      repo_url: 'https://github.com/example/blockchain-battlers',
      demo_url: 'https://battlers.example.com',
      team: ['@battlerdev', '@artpixel'],
      metrics: {
        classification: 'Whole Game',
        team_size: 2,
        dojo_contracts: '8 models, 5 systems',
        frontend_sdk: true,
        jam_commits_pct: 88,
        playability: 'Live',
      },
    },
    {
      id: '85',
      title: 'Crypto Creatures',
      summary_short:
        'Collect, breed, and battle creatures with provably fair genetics. Each creature is a unique on-chain entity with inherited traits.',
      summary_long:
        'Crypto Creatures is a creature collection game where genetics are computed entirely on-chain. Players collect starter creatures, breed them to produce offspring with inherited traits, and battle them against other players. The breeding algorithm uses Cairo-based genetic simulation with dominant and recessive traits, ensuring provably fair outcomes. Each creature is stored as a Dojo model with stats, abilities, and visual trait data. The battle system is turn-based with type advantages and special moves. The game does not have a live deployment yet but includes a comprehensive video walkthrough of all mechanics. Built by a solo developer using vanilla JavaScript and HTML canvas for the frontend.',
      repo_url: 'https://github.com/example/crypto-creatures',
      video_url: 'https://youtube.com/watch?v=ghi789',
      team: ['@creaturemaster'],
      metrics: {
        classification: 'Whole Game',
        team_size: 1,
        dojo_contracts: '10 models, 7 systems',
        frontend_sdk: false,
        jam_commits_pct: 97,
        playability: 'Video',
      },
    },
    {
      id: '92',
      title: 'Stark Survival',
      summary_short:
        'Multiplayer survival game where resources and territory are on-chain. Harvest, craft, and defend your base against other players.',
      summary_long:
        'Stark Survival is a multiplayer survival game built on Starknet where all resources, territory, and player interactions are recorded on-chain. Players spawn into a shared world, harvest resources from the environment, craft tools and weapons, and build bases to defend against other players. The territory system uses a hex grid stored in Dojo models, with ownership tracked through smart contracts. Combat is real-time with cooldown-based abilities. The game features seasonal events that change resource distribution and introduce special challenges. Currently playable only via local setup — clone the repo, start Katana, deploy with Sozo, and run the React client locally.',
      repo_url: 'https://github.com/example/stark-survival',
      team: ['@survivalcoder', '@worldbuilder', '@combatdev'],
      metrics: {
        classification: 'Whole Game',
        team_size: 3,
        dojo_contracts: '12 models, 9 systems',
        frontend_sdk: true,
        jam_commits_pct: 85,
        playability: 'Local',
      },
    },
  ],
};

// In-memory cache for GitHub-fetched entries
const entriesCache: Map<string, { entries: Entry[]; fetchedAt: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getEntries(jamSlug: string): Promise<Entry[]> {
  // Check cache first
  const cached = entriesCache.get(jamSlug);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.entries;
  }

  // In dev mode or if GitHub fetch fails, use dummy data
  if (process.env.DEV_AUTH_BYPASS === 'true') {
    return DUMMY_ENTRIES[jamSlug] || DUMMY_ENTRIES['gj7'];
  }

  // TODO: Fetch from GitHub
  // const url = `https://raw.githubusercontent.com/dojoengine/game-jams/main/${jamSlug}/entries.yaml`;
  // For now, return dummy data
  return DUMMY_ENTRIES[jamSlug] || DUMMY_ENTRIES['gj7'];
}

export function getEntryById(entries: Entry[], id: string): Entry | undefined {
  return entries.find((e) => e.id === id);
}
