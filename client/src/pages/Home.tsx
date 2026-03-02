import { Link } from 'react-router-dom';
import { useGameJam } from '../hooks/useGameJam';
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

const links = [
  { label: 'Dojo Discord', href: 'https://discord.gg/dojoengine', icon: DiscordIcon },
  { label: 'Dojo Book', href: 'https://book.dojoengine.org', icon: BookIcon },
  { label: 'Game Jams', href: 'https://github.com/dojoengine/game-jams', icon: TrophyIcon },
  { label: 'Daimyo GitHub', href: 'https://github.com/cartridge-gg/daimyo', icon: GitHubIcon },
];

function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const duration = days === 1 ? '24 hours' : `${days * 24} hours`;
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()} · ${duration} · Online`;
}

export default function Home() {
  const { jam, loading } = useGameJam();

  return (
    <div className="home-page">
      <div className="home-container">
        {/* Hero */}
        <div className="home-hero">
          <img src="/logo.png" alt="Daimyō" className="home-logo" />
          <h1 className="home-title">Daimyō</h1>
          <p className="home-tagline">Community bot for the <a href="https://discord.gg/dojoengine" target="_blank" rel="noopener noreferrer" className="home-tagline-link">Dojo Discord</a></p>
          <div className="home-pillars">
            <span className="home-pillar">Reputation</span>
            <span className="home-pillar">Content</span>
            <span className="home-pillar">Judging</span>
          </div>
        </div>

        {/* Game Jam */}
        {!loading && jam && (
          <div className="home-jam">
            <div className="home-jam-inner">
              <div className="home-jam-header">
                <div>
                  <h2 className="home-jam-title">{jam.title}</h2>
                  <p className="home-jam-dates">
                    {formatDateRange(jam.startDate, jam.endDate)} · {jam.prizePool} in prizes
                  </p>
                </div>
                <div className="home-jam-header-actions">
                  {jam.isActive ? (
                    <>
                      {jam.registrationUrl && (
                        <a
                          href={jam.registrationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="home-jam-cta home-jam-cta-primary"
                        >
                          Register Now
                        </a>
                      )}
                      <span
                        className="home-jam-cta home-jam-cta-disabled"
                        title={`Judging opens after the jam ends (${jam.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                      >
                        Judge Entries
                      </span>
                    </>
                  ) : (
                    <Link to={`/judge/${jam.slug}`} className="home-jam-cta home-jam-cta-gold">
                      Judge Entries
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="home-divider" />

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
