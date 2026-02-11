import './Home.css';

function DiscordIcon() {
  return (
    <svg className="home-link-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className="home-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="home-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="home-link-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const features = [
  {
    title: 'Reputation',
    description:
      'Peer-driven role progression via :dojo: reactions. Kōhai → Senpai → Sensei → Meijin.',
    href: 'https://github.com/dojoengine/daimyo/blob/main/spec/REPUTATION.md',
  },
  {
    title: 'Game Jam Judging',
    description:
      'Pairwise comparison system for ranking community game jam entries.',
    href: 'https://github.com/dojoengine/daimyo/blob/main/spec/JUDGING.md',
  },
  {
    title: 'Content Pipeline',
    description:
      'Automated Discord-to-Twitter content generation with AI-crafted images.',
    href: 'https://github.com/dojoengine/daimyo/blob/main/spec/CONTENT.md',
  },
];

const links = [
  { label: 'Dojo Discord', href: 'https://discord.gg/dojoengine', icon: DiscordIcon },
  { label: 'Dojo Book', href: 'https://book.dojoengine.org', icon: BookIcon },
  { label: 'Game Jams', href: 'https://github.com/dojoengine/game-jams', icon: TrophyIcon },
  { label: 'GitHub', href: 'https://github.com/cartridge-gg/daimyo', icon: GitHubIcon },
];

export default function Home() {
  return (
    <div className="home-page">
      <div className="home-container">
        {/* Hero */}
        <div className="home-hero">
          <img src="/logo.png" alt="Daimyō" className="home-logo" />
          <h1 className="home-title">Daimyō</h1>
          <p className="home-tagline">Community bot for the Dojo Discord</p>
        </div>

        <div className="home-divider" />

        {/* Features */}
        <div className="home-features">
          {features.map((f) => (
            <a
              key={f.title}
              href={f.href}
              target="_blank"
              rel="noopener noreferrer"
              className="home-feature"
            >
              <h2 className="home-feature-title">{f.title}</h2>
              <p className="home-feature-desc">{f.description}</p>
            </a>
          ))}
        </div>

        {/* Game Jam */}
        <div className="home-jam">
          <div className="home-jam-inner">
            <span className="home-jam-label">Now Open</span>
            <h2 className="home-jam-title">Game Jam VIII</h2>
            <p className="home-jam-dates">Feb 27 – Mar 2, 2026 · 72 hours · Online</p>
            <p className="home-jam-desc">
              Build a fully onchain game with Dojo and Cartridge in 72 hours.
              $10,000 in prizes. Up to 5 per team.
            </p>
            <div className="home-jam-grid">
              <div>
                <h3 className="home-jam-section-title">Requirements</h3>
                <ul className="home-jam-list">
                  <li>Built with Dojo Engine (Cairo contracts)</li>
                  <li>Deployed to Slot or Sepolia testnet</li>
                  <li>Cartridge Controller integration</li>
                  <li>Functional frontend using Dojo SDK</li>
                </ul>
              </div>
              <div>
                <h3 className="home-jam-section-title">Judging</h3>
                <ul className="home-jam-list">
                  <li>Novel use of Dojo's unique features</li>
                  <li>Concept and mechanic originality</li>
                  <li>Visual and game design quality</li>
                  <li>Entertainment value</li>
                </ul>
              </div>
            </div>
            <div className="home-jam-actions">
              <a
                href="https://luma.com/w1wxpfv3"
                target="_blank"
                rel="noopener noreferrer"
                className="home-jam-cta home-jam-cta-primary"
              >
                Register on Luma
              </a>
              <a href="/judge/gj8" className="home-jam-cta home-jam-cta-secondary">
                Judge Entries
              </a>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="home-links">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="home-link"
            >
              <l.icon />
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
