import React from "react";
import "./Doc2mePitchHeroV1.css";

interface Doc2mePitchHeroV1Props {
  onLoginClick?: () => void;
}

const Doc2mePitchHeroV1: React.FC<Doc2mePitchHeroV1Props> = ({ onLoginClick }) => {
  const handleLogin = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      window.location.href = "/?view=login";
    }
  };

  const handleSignUp = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      window.location.href = "/?view=login"; // Redirecting to main login/register page
    }
  };

  return (
    <div className="pitch-v1-canvas">
      {/* BACKGROUND GRAPHICS & RADIAL GLOWS */}
      <div className="pitch-v1-bg-glows">
        <div className="pitch-v1-glow glow-5b2eff" />
        <div className="pitch-v1-glow glow-7b3ff2" />
        <div className="pitch-v1-glow glow-a855f7" />
        <div className="pitch-v1-glow glow-ff6fb5" />
        <div className="pitch-v1-glow glow-ffd166" />
      </div>

      {/* FLOATING WHATSAPP CARDS - BEHIND CONTENT */}
      <div className="pitch-v1-floating-cards">
        {/* Card 1: Patient text message (English Sugar) */}
        <div className="pitch-v1-card p-card p-card-1">
          <div className="p-card-header">Patient</div>
          <div className="p-card-body">Today's sugar is 126 fasting.</div>
        </div>

        {/* Card 2: AI Reply (Sugar Saved) */}
        <div className="pitch-v1-card ai-card ai-card-1">
          <div className="p-card-header">Doc2Me AI</div>
          <div className="p-card-body">Sugar saved successfully.</div>
        </div>

        {/* Card 3: Patient text message (Hindi Sugar) */}
        <div className="pitch-v1-card p-card p-card-2">
          <div className="p-card-header">Patient</div>
          <div className="p-card-body">आज शुगर 126 है।</div>
        </div>

        {/* Card 4: AI Reply (Inquiry) */}
        <div className="pitch-v1-card ai-card ai-card-2">
          <div className="p-card-header">Doc2Me AI</div>
          <div className="p-card-body">क्या यह fasting reading है?</div>
        </div>

        {/* Card 5: Patient text message (Hinglish Sugar) */}
        <div className="pitch-v1-card p-card p-card-3">
          <div className="p-card-header">Patient</div>
          <div className="p-card-body">Sugar fasting 126 hai.</div>
        </div>

        {/* Card 6: Patient text message (BP English) */}
        <div className="pitch-v1-card p-card p-card-4">
          <div className="p-card-header">Patient</div>
          <div className="p-card-body">BP 128/82 today.</div>
        </div>

        {/* Card 7: AI Reply (BP Saved) */}
        <div className="pitch-v1-card ai-card ai-card-3">
          <div className="p-card-header">Doc2Me AI</div>
          <div className="p-card-body">Blood pressure recorded.</div>
        </div>

        {/* Card 8: Patient text message (Hindi BP) */}
        <div className="pitch-v1-card p-card p-card-5">
          <div className="p-card-header">Patient</div>
          <div className="p-card-body">आज BP 128/82 है।</div>
        </div>

        {/* Card 9: Patient text message (Weight & Pulse) */}
        <div className="pitch-v1-card p-card p-card-6">
          <div className="p-card-header">Patient</div>
          <div className="p-card-body">Weight 71 kg. Pulse 74.</div>
        </div>

        {/* Card 10: AI Reply (Weight updated) */}
        <div className="pitch-v1-card ai-card ai-card-4">
          <div className="p-card-header">Doc2Me AI</div>
          <div className="p-card-body">Weight updated.</div>
        </div>

        {/* Card 11: AI Reply (Health record updated) */}
        <div className="pitch-v1-card ai-card ai-card-5">
          <div className="p-card-header">Doc2Me AI</div>
          <div className="p-card-body">Health record updated.</div>
        </div>

        {/* Card 12: WhatsApp Voice Note Card */}
        <div className="pitch-v1-card voice-card">
          <div className="voice-card-header">
            <span className="wa-logo-small">🟢</span> Voice Note
          </div>
          <div className="voice-card-player">
            <button className="voice-play-btn">▶</button>
            <div className="voice-waveform">
              <div className="wave-bar bar-1"></div>
              <div className="wave-bar bar-2"></div>
              <div className="wave-bar bar-3"></div>
              <div className="wave-bar bar-4"></div>
              <div className="wave-bar bar-5"></div>
              <div className="wave-bar bar-6"></div>
              <div className="wave-bar bar-7"></div>
              <div className="wave-bar bar-8"></div>
            </div>
            <span className="voice-duration">0:18</span>
          </div>
        </div>

        {/* Card 13: AI Reply (Voice note processed) */}
        <div className="pitch-v1-card ai-card ai-card-6">
          <div className="p-card-header">Doc2Me AI</div>
          <div className="p-card-body">Voice note processed.</div>
        </div>

        {/* Card 14: WhatsApp Image Message Card */}
        <div className="pitch-v1-card image-card">
          <div className="image-card-header">Lab Report Upload</div>
          <div className="image-card-preview">
            <div className="image-card-icon-wrap">
              <svg className="image-card-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div className="image-card-info">
              <span className="image-card-title">blood_test_report.pdf</span>
              <span className="image-card-status">Analyzed by Doc2Me</span>
            </div>
          </div>
        </div>

        {/* Card 15: AI Reply (Record saved successfully) */}
        <div className="pitch-v1-card ai-card ai-card-7">
          <div className="p-card-header">Doc2Me AI</div>
          <div className="p-card-body">Record saved successfully.</div>
        </div>

        {/* Card 16: Health Summary Card */}
        <div className="pitch-v1-card summary-card">
          <div className="summary-card-title">Health Summary</div>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Sugar</span>
              <span className="summary-val">126 <small>mg/dL</small></span>
            </div>
            <div className="summary-item">
              <span className="summary-label">BP</span>
              <span className="summary-val">128/82 <small>mmHg</small></span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Weight</span>
              <span className="summary-val">71 <small>kg</small></span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Pulse</span>
              <span className="summary-val">74 <small>bpm</small></span>
            </div>
          </div>
        </div>
      </div>

      {/* MINIMAL PREMIUM HEADER */}
      <header className="pitch-v1-header">
        <div className="header-logo-container">
          <img src="/images/branding/logo-horizontal.png" alt="Doc2Me Logo" className="pitch-v1-logo" />
        </div>
        <div className="header-actions">
          <button className="pitch-v1-btn-login" onClick={handleLogin}>
            Login
          </button>
          <button className="pitch-v1-btn-signup" onClick={handleSignUp}>
            Sign Up
          </button>
        </div>
      </header>

      {/* CENTRAL HERO SECTION */}
      <main className="pitch-v1-hero-main">
        <div className="pitch-v1-hero-content">
          <div className="pitch-v1-badge">
            <span className="pitch-v1-badge-pulse" />
            <span className="pitch-v1-badge-text">100% Secure AI-Powered Health Logging</span>
          </div>

          <h1 className="pitch-v1-title">
            The WhatsApp Companion <br />
            <span className="pitch-v1-title-gradient">For Your Health Records</span>
          </h1>

          <p className="pitch-v1-subtitle">
            Just type or speak your daily vitals directly to Doc2Me on WhatsApp. No forms, no apps, no friction. Build structured clinical history automatically.
          </p>

          <div className="pitch-v1-ctas">
            <button className="pitch-v1-cta-primary" onClick={handleSignUp}>
              Launch on WhatsApp
              <svg className="cta-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <button className="pitch-v1-cta-secondary" onClick={handleLogin}>
              See How It Works
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Doc2mePitchHeroV1;
