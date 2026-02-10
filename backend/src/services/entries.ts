export interface Entry {
  id: string;
  title: string;
  description?: string;
  author_github: string;
  demo_url?: string;
  video_url?: string;
}

// Dummy entries for local testing
const DUMMY_ENTRIES: Record<string, Entry[]> = {
  gj7: [
    {
      id: '42',
      title: 'On-Chain Chess',
      description:
        'A fully on-chain chess engine built with Dojo. Play chess where every move is a transaction.',
      author_github: 'octocat',
      demo_url: 'https://chess.example.com',
      video_url: 'https://youtube.com/watch?v=abc123',
    },
    {
      id: '57',
      title: 'Dojo Dungeon',
      description: 'Roguelike dungeon crawler with procedurally generated levels and permadeath.',
      author_github: 'dungeondev',
      demo_url: 'https://dungeon.example.com',
    },
    {
      id: '63',
      title: 'Cairo Kart',
      description: 'Racing game with on-chain leaderboards and NFT vehicles.',
      author_github: 'kartmaster',
      demo_url: 'https://kart.example.com',
      video_url: 'https://youtube.com/watch?v=def456',
    },
    {
      id: '71',
      title: 'Blockchain Battlers',
      description: 'Turn-based strategy game with verifiable randomness and on-chain tournaments.',
      author_github: 'battlerdev',
      demo_url: 'https://battlers.example.com',
    },
    {
      id: '85',
      title: 'Crypto Creatures',
      description: 'Collect, breed, and battle creatures with provably fair genetics.',
      author_github: 'creaturemaster',
      video_url: 'https://youtube.com/watch?v=ghi789',
    },
    {
      id: '92',
      title: 'Stark Survival',
      description: 'Multiplayer survival game where resources and territory are on-chain.',
      author_github: 'survivalcoder',
      demo_url: 'https://survival.example.com',
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
