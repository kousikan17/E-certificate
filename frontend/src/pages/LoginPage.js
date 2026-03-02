import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [tab, setTab] = useState('coordinator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { adminLogin, coordinatorLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'admin') {
        await adminLogin(email, password);
        navigate('/admin');
      } else {
        await coordinatorLogin(email, password);
        navigate('/coordinator');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-grid-bg" />

      {/* Nav */}
      <nav className="auth-nav">
        <Link to="/" className="auth-nav-brand">
          <div className="auth-nav-logo">TV</div>
          <span className="auth-nav-title">TwinVerify</span>
        </Link>
      </nav>

      {/* Main */}
      <main className="auth-main">
        <div className="auth-glow" />

        <div className="auth-card">
          <div className="auth-card-logo">TV</div>
          <h1 className="auth-card-heading">Welcome back</h1>
          <p className="auth-card-sub">Sign in to manage certificates</p>

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab${tab === 'coordinator' ? ' auth-tab--active' : ''}`}
              onClick={() => { setTab('coordinator'); setError(''); }}
            >
              Coordinator
            </button>
            <button
              type="button"
              className={`auth-tab${tab === 'admin' ? ' auth-tab--active' : ''}`}
              onClick={() => { setTab('admin'); setError(''); }}
            >
              Admin
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Email address</label>
              <input
                type="email"
                className="auth-input"
                placeholder={tab === 'admin' ? 'admin@example.com' : 'coordinator@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                type="password"
                className="auth-input"
                placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Signing in\u2026' : `Sign in as ${tab === 'admin' ? 'Admin' : 'Coordinator'}`}
            </button>
          </form>

          <Link to="/" className="auth-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="auth-footer">
        Powered by{' '}
        <a href="https://twincord.in" target="_blank" rel="noopener noreferrer">
          Twincord Technologies
        </a>
      </footer>
    </div>
  );
};

export default LoginPage;
