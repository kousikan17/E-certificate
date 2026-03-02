import React from 'react';
import { useNavigate } from 'react-router-dom';
import { downloadPublicCertificate } from '../services/download';

const LandingPage = () => {
  // Removed unused isMobile state
  const navigate = useNavigate();

  // Removed unused isMobile effect

  const ClaimCertificateButton = ({ certificateId, filename }) => (
    <button
      className="btn btn-primary"
      onClick={() => downloadPublicCertificate(certificateId, filename)}
      style={{ marginTop: 16 }}
    >
      🎓 Claim your certificate
    </button>
  );

  return (
    <div className="lp">

      {/* Subtle grid background */}
      <div className="lp-grid-bg" />

      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <div className="lp-nav-logo">TV</div>
          <span className="lp-nav-title">TwinVerify</span>
        </div>
        <div className="lp-nav-right">
          <span className="lp-nav-dot" />
          <span className="lp-nav-status">All systems operational</span>
        </div>
      </nav>

      {/* Hero */}
      <main className="lp-hero">

        {/* Top glow */}
        <div className="lp-glow" />

        <div className="lp-content">

          {/* Tag */}
          <div className="lp-tag">
            <span className="lp-tag-line" />
            Certificate Generation System
            <span className="lp-tag-line" />
          </div>

          <h1 className="lp-heading">
            Generate &amp; Distribute<br />
            <span className="lp-heading-accent">Certificates</span>
          </h1>

          <p className="lp-sub">
            Create beautiful certificates from templates and send them
            directly to participants via email.
          </p>

          {/* CTA Button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
            <button
              className="lp-search-btn lp-search-btn--active"
              onClick={() => navigate('/login')}
              style={{ padding: '14px 48px', fontSize: 16, cursor: 'pointer' }}
            >
              Get Started
            </button>
          </div>

          {/* Claim Certificate Button Demo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <ClaimCertificateButton certificateId={1} filename="sample-certificate.pdf" />
          </div>

          {/* Divider */}
          <div className="lp-sep" />

          {/* Trust strip */}
          <div className="lp-trust">
            <div className="lp-trust-item">
              <span className="lp-trust-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </span>
              <span className="lp-trust-label">Instant</span>
            </div>

            <div className="lp-trust-item">
              <span className="lp-trust-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </span>
              <span className="lp-trust-label">Download</span>
            </div>

            <div className="lp-trust-item">
              <span className="lp-trust-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <span className="lp-trust-label">Secure</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-copy">&copy; {new Date().getFullYear()} TwinVerify. All rights reserved.</div>
        <div>
          Powered by{' '}
          <a href="https://twincord.in" target="_blank" rel="noopener noreferrer">
            Twincord Technologies
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
