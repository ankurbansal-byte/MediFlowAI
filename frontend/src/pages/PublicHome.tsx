import React, { useState } from "react";
import "./PublicHome.css";

interface PublicHomeProps {
  onLoginClick: () => void;
}

const PublicHome: React.FC<PublicHomeProps> = ({ onLoginClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="pub-home-container">
      {/* Navigation Header */}
      <header className="pub-header">
        <a href="#home" className="pub-logo-container" onClick={() => handleScrollTo("home")}>
          <span className="pub-logo-mark">+</span>
          <span className="pub-logo-text">MediFlowAI</span>
        </a>

        <button
          className="pub-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>

        <nav className={`pub-nav ${mobileMenuOpen ? "active" : ""}`}>
          <span className="pub-nav-link" onClick={() => handleScrollTo("how-it-works")}>How It Works</span>
          <span className="pub-nav-link" onClick={() => handleScrollTo("for-patients")}>For Patients</span>
          <span className="pub-nav-link" onClick={() => handleScrollTo("for-doctors")}>For Doctors</span>
          <span className="pub-nav-link" onClick={() => handleScrollTo("for-hospitals")}>For Hospitals</span>
          <button className="pub-login-btn" onClick={onLoginClick}>Login</button>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="home" className="pub-hero-section">
        <div className="pub-hero-content">
          <span className="pub-hero-tagline">✦ Next-Generation Clinical Intelligence</span>
          <h1 className="pub-hero-title">Health records that build themselves.</h1>
          <p className="pub-hero-subtitle">
            MediFlowAI transforms everyday patient health updates into organized longitudinal health information that patients and their care teams can understand. No heavy data entry. Minimum input, maximum intelligence.
          </p>
          <div className="pub-hero-actions">
            <button className="pub-btn-primary" onClick={() => handleScrollTo("how-it-works")}>Explore MediFlowAI</button>
            <button className="pub-btn-secondary" onClick={onLoginClick}>Login to Portals</button>
          </div>
        </div>

        <div className="pub-hero-illustration-container">
          <div className="pub-sketch-illustration">
            {/* Beautiful, custom inline SVG for the watercolor + fine pencil sketch storytelling concept */}
            <svg
              viewBox="0 0 500 450"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: "100%", height: "auto" }}
            >
              {/* Soft Watercolor Backdrop Blobs */}
              <circle cx="100" cy="120" r="70" fill="rgba(0, 163, 137, 0.08)" />
              <circle cx="250" cy="220" r="85" fill="rgba(0, 128, 255, 0.07)" />
              <circle cx="400" cy="320" r="75" fill="rgba(10, 37, 64, 0.05)" />

              {/* Hand-drawn look Pencil Connective Paths (Dashed) */}
              <path d="M120 160 Q 180 200 210 210" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M290 220 Q 340 210 380 180" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M270 270 Q 300 340 370 350" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />

              {/* LEFT NODE: Patient at Home with Phone */}
              <g transform="translate(40, 60)">
                <rect x="0" y="0" width="110" height="130" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="55" y="25" textAnchor="middle" fill="#0a2540" fontSize="11" fontWeight="700">PATIENT AT HOME</text>

                {/* Smartphone Icon */}
                <rect x="40" y="40" width="30" height="55" rx="6" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
                <rect x="44" y="46" width="22" height="40" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                <circle cx="55" cy="90" r="2" fill="#475569" />

                {/* Natural Message bubble floating */}
                <rect x="-10" y="70" width="65" height="30" rx="6" fill="#e6f4ea" stroke="#137333" strokeWidth="1" />
                <text x="22" y="85" textAnchor="middle" fill="#137333" fontSize="8" fontWeight="600">"My sugar is 125"</text>
                <path d="M50 85 L55 90 L50 92 Z" fill="#e6f4ea" stroke="#137333" strokeWidth="1" />

                <text x="55" y="115" textAnchor="middle" fill="#00a389" fontSize="10" fontWeight="700">Natural Updates</text>
              </g>

              {/* CENTER NODE: AI Organizing Engine */}
              <g transform="translate(195, 175)">
                <circle cx="55" cy="55" r="50" fill="#ffffff" stroke="#0080ff" strokeWidth="2" />
                <circle cx="55" cy="55" r="42" fill="none" stroke="#e0f2fe" strokeWidth="4" strokeDasharray="3 3" />

                {/* Spark/AI Motifs */}
                <path d="M55 25 L55 85 M25 55 L85 55" stroke="#93c5fd" strokeWidth="1.5" />
                <path d="M37 37 L73 73 M37 73 L73 37" stroke="#93c5fd" strokeWidth="1" strokeDasharray="2 2" />

                <circle cx="55" cy="55" r="16" fill="#0080ff" />
                <text x="55" y="59" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="800">AI</text>

                <text x="55" y="122" textAnchor="middle" fill="#0080ff" fontSize="11" fontWeight="800">ORGANIZATION</text>
              </g>

              {/* RIGHT NODE 1: Organized Timeline & Trends */}
              <g transform="translate(345, 60)">
                <rect x="0" y="0" width="120" height="135" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="60" y="22" textAnchor="middle" fill="#0a2540" fontSize="10" fontWeight="700">STRUCTURED RECORDS</text>

                {/* Small Chart Line */}
                <path d="M20 90 L40 70 L60 85 L80 50 L100 65" stroke="#0080ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="80" cy="50" r="3" fill="#0080ff" />

                {/* Vitals Labels */}
                <rect x="15" y="102" width="90" height="20" rx="4" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
                <text x="60" y="115" textAnchor="middle" fill="#166534" fontSize="8" fontWeight="700">Sugar: 125 mg/dL (Normal)</text>
              </g>

              {/* RIGHT NODE 2: Care Team Workspace (No active data entry) */}
              <g transform="translate(345, 235)">
                <rect x="0" y="0" width="120" height="135" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                <text x="60" y="22" textAnchor="middle" fill="#0a2540" fontSize="10" fontWeight="700">DOCTOR PORTAL</text>

                {/* Doctor Icon Symbol */}
                <circle cx="60" cy="52" r="14" fill="#e0f2fe" stroke="#0080ff" strokeWidth="1.5" />
                <text x="60" y="56" textAnchor="middle" fill="#0080ff" fontSize="13" fontWeight="bold">🩺</text>

                {/* Dashboard mock lines */}
                <rect x="20" y="78" width="80" height="6" rx="3" fill="#f1f5f9" />
                <rect x="20" y="88" width="60" height="6" rx="3" fill="#e2e8f0" />

                {/* Green badge: Consuming, NOT entering */}
                <rect x="25" y="104" width="70" height="18" rx="9" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                <text x="60" y="116" textAnchor="middle" fill="#047857" fontSize="8" fontWeight="700">Reviewing Insights</text>
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="pub-section-how">
        <div className="pub-section-inner">
          <h2 className="pub-section-title">How MediFlowAI Works</h2>
          <p className="pub-section-subtitle">
            Say goodbye to traditional heavy data-entry. MediFlowAI enables a smooth, automated workflow for healthy communication.
          </p>

          <div className="pub-steps-grid">
            <div className="pub-step-card">
              <span className="pub-step-num">1</span>
              <div className="pub-step-icon" style={{ fontSize: "32px", display: "block" }}>💬</div>
              <h3>1. Simply Share</h3>
              <p>
                Patients share health updates naturally, including logs like blood sugar, blood pressure, or weight, through familiar messaging tools.
              </p>
            </div>

            <div className="pub-step-card">
              <span className="pub-step-num">2</span>
              <div className="pub-step-icon" style={{ fontSize: "32px", display: "block" }}>🧠</div>
              <h3>2. AI Organizes</h3>
              <p>
                MediFlowAI securely extracts the clinical values and structures them into highly accurate longitudinal charts, logs, and timelines.
              </p>
            </div>

            <div className="pub-step-card">
              <span className="pub-step-num">3</span>
              <div className="pub-step-icon" style={{ fontSize: "32px", display: "block" }}>📈</div>
              <h3>3. Clinically Useful</h3>
              <p>
                Doctors access structured summaries, trends, and clinical telemetry immediately. No extra typing, just smart patient care.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Sections */}
      <section id="value" className="pub-section-value">
        <div className="pub-section-inner" style={{ marginBottom: "50px" }}>
          <h2 className="pub-section-title">A Solution Built For Everyone</h2>
          <p className="pub-section-subtitle">
            Minimal design meets high intelligence to serve patients, doctors, and hospitals in unified harmony.
          </p>
        </div>

        <div className="pub-value-grid">
          {/* For Patients */}
          <div id="for-patients" className="pub-value-card">
            <span className="pub-value-badge patient-badge">For Patients</span>
            <h3>Natural Log & Insights</h3>
            <p>
              Message naturally without opening heavy mobile apps or filling manual forms. Securely view your trends, past visits, AI-driven wellness feedback, and care plans.
            </p>
          </div>

          {/* For Doctors */}
          <div id="for-doctors" className="pub-value-card">
            <span className="pub-value-badge doctor-badge">For Doctors</span>
            <h3>Read-Driven Workspace</h3>
            <p>
              Say goodbye to administrative typing fatigue. Access neat charts, structured vitals trends, chronologically structured encounters, and AI-summarized health history before you consult.
            </p>
          </div>

          {/* For Hospitals */}
          <div id="for-hospitals" className="pub-value-card">
            <span className="pub-value-badge hospital-badge">For Hospitals</span>
            <h3>Complete Control & Safety</h3>
            <p>
              Administer multi-tenant records with secure boundaries. Control patient enrollment, doctor registry, OPD scheduling, and access control with flawless precision.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pub-footer">
        <div className="pub-footer-inner">
          <div className="pub-footer-brand">
            <span>+</span> MediFlowAI
          </div>
          <div className="pub-footer-text">
            &copy; {new Date().getFullYear()} MediFlowAI Platform. Built for medical clarity and human-scale healthcare.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicHome;
