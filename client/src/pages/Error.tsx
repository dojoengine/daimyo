import { useSearchParams } from 'react-router-dom';
import './Error.css';

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
    <div className="error-page">
      <div className="error-content">
        <h1 className="error-title">Access Denied</h1>
        <p className="error-message">{message}</p>
        <a href="/" className="error-home-link">
          Return Home
        </a>
      </div>
    </div>
  );
}
