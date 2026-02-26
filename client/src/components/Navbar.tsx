import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Navbar.css';

const navItems = [
  { label: 'Game Jam Judging', to: '/judge' },
  { label: 'Wallet Connect', to: '#', disabled: true, tooltip: 'Coming Soon' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close account menu on click outside
  useEffect(() => {
    if (!accountOpen) return;
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [accountOpen]);

  const handleLogout = () => {
    logout();
    setAccountOpen(false);
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
          Daimyō
        </Link>

        <div className="navbar-links">
          {navItems.map((item) =>
            item.disabled ? (
              <span
                key={item.label}
                className="navbar-link navbar-link--disabled"
                title={item.tooltip}
              >
                {item.label}
              </span>
            ) : (
              <Link
                key={item.label}
                to={item.to}
                className={`navbar-link ${pathname.startsWith(item.to) ? 'navbar-link--active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ),
          )}
        </div>

        {user ? (
          <div className="navbar-account" ref={accountRef}>
            <button className="navbar-user" onClick={() => setAccountOpen(!accountOpen)}>
              <span>{user.username}</span>
            </button>
            {accountOpen && (
              <div className="navbar-account-menu">
                <button className="navbar-account-action" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <a href="/api/auth/discord" className="navbar-login">
            Login with Discord
          </a>
        )}

        <button
          className={`navbar-hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuOpen && (
        <div className="navbar-dropdown">
          <Link to="/" className="navbar-dropdown-link" onClick={() => setMenuOpen(false)}>
            Daimyō
          </Link>
          {navItems.map((item) =>
            item.disabled ? (
              <span key={item.label} className="navbar-dropdown-link navbar-dropdown-link--disabled" title={item.tooltip}>
                {item.label}
              </span>
            ) : (
              <Link
                key={item.label}
                to={item.to}
                className={`navbar-dropdown-link ${pathname.startsWith(item.to) ? 'navbar-dropdown-link--active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ),
          )}
          {user ? (
            <div className="navbar-dropdown-account">
              <div className="navbar-dropdown-user">
                <span>{user.username}</span>
              </div>
              <button className="navbar-dropdown-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <a href="/api/auth/discord" className="navbar-dropdown-login" onClick={() => setMenuOpen(false)}>
              Login with Discord
            </a>
          )}
        </div>
      )}

      <div className="navbar-divider" />
    </nav>
  );
}
