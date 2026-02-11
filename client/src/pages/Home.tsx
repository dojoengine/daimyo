import './Home.css';

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
  { label: 'Dojo Discord', href: 'https://discord.gg/dojoengine' },
  { label: 'Dojo Book', href: 'https://book.dojoengine.org' },
  {
    label: 'Game Jams',
    href: 'https://github.com/dojoengine/game-jams',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/cartridge-gg/daimyo',
  },
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
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
