const features = [
  {
    title: 'Reputation',
    description:
      'Peer-driven role progression via :dojo: reactions. Kōhai → Senpai → Sensei → Meijin.',
  },
  {
    title: 'Game Jam Judging',
    description:
      'Pairwise comparison system for ranking community game jam entries.',
  },
  {
    title: 'Content Pipeline',
    description:
      'Automated Discord-to-Twitter content generation with AI-crafted images.',
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
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Hero */}
        <div style={styles.hero}>
          <img src="/logo.png" alt="Daimyō" style={styles.logo} />
          <h1 style={styles.title}>Daimyō</h1>
          <p style={styles.tagline}>Community bot for the Dojo Discord</p>
        </div>

        {/* Features */}
        <div style={styles.features}>
          {features.map((f) => (
            <div key={f.title} style={styles.card}>
              <h2 style={styles.cardTitle}>{f.title}</h2>
              <p style={styles.cardDescription}>{f.description}</p>
            </div>
          ))}
        </div>

        {/* Links */}
        <div style={styles.links}>
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a1628',
    color: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
  },
  container: {
    maxWidth: 900,
    width: '100%',
  },
  hero: {
    textAlign: 'center',
    marginBottom: 64,
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.02em',
  },
  tagline: {
    fontSize: 20,
    color: '#8899aa',
    marginTop: 12,
  },
  features: {
    display: 'flex',
    gap: 20,
    marginBottom: 64,
    flexWrap: 'wrap' as const,
  },
  card: {
    flex: '1 1 240px',
    background: '#0f1d32',
    border: '1px solid #1a2a44',
    borderRadius: 12,
    padding: '28px 24px',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8,
    color: '#e0e0e0',
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 1.5,
    color: '#8899aa',
    margin: 0,
  },
  links: {
    display: 'flex',
    justifyContent: 'center',
    gap: 32,
    flexWrap: 'wrap' as const,
  },
  link: {
    color: '#ff1a3d',
    textDecoration: 'none',
    fontSize: 16,
    fontWeight: 500,
  },
};
