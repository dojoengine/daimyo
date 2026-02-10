import { useSearchParams } from 'react-router-dom';

export default function ErrorPage() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  let message = 'An unknown error occurred.';
  if (reason === 'role') {
    message = 'You must have the Sensei role to judge game jam entries.';
  } else if (reason === 'auth') {
    message = 'Authentication failed. Please try again.';
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Access Denied</h1>
        <p style={styles.message}>{message}</p>
        <a href="/" style={styles.link}>
          Return Home
        </a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    textAlign: 'center',
  },
  title: {
    fontSize: '32px',
    marginBottom: '20px',
    color: '#ff6b6b',
  },
  message: {
    fontSize: '18px',
    color: '#888',
    marginBottom: '30px',
  },
  link: {
    color: '#5865f2',
    textDecoration: 'none',
  },
};
