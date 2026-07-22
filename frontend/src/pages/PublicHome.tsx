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
          <span className="pub-hero-tagline">✦ Minimum input, maximum intelligence</span>
          <h1 className="pub-hero-title">Health records that build themselves.</h1>
          <p className="pub-hero-subtitle">
            MediFlowAI transforms everyday WhatsApp messages into organized longitudinal health information. No forms, no manual clinical data entry, and no traditional EMR typing.
          </p>
          <div className="pub-hero-actions">
            <button className="pub-btn-primary" onClick={() => handleScrollTo("how-it-works")}>See how it works</button>
            <button className="pub-btn-secondary" onClick={onLoginClick}>Access Portals</button>
          </div>
        </div>

        <div className="pub-hero-illustration-container">
          <div className="pub-sketch-illustration">
            {/* Custom watercolor + pencil-sketch SVG storytelling illustration */}
            <svg
              viewBox="0 0 600 520"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: "100%", height: "auto" }}
            >
              {/* Soft Watercolor Backdrop Blobs (Translucent, organic style) */}
              <circle cx="130" cy="120" r="75" fill="rgba(0, 163, 137, 0.09)" /> {/* Patient blob */}
              <circle cx="470" cy="110" r="75" fill="rgba(0, 128, 255, 0.08)" /> {/* AI blob */}
              <circle cx="140" cy="380" r="80" fill="rgba(10, 37, 64, 0.05)" />  {/* Record blob */}
              <circle cx="460" cy="390" r="75" fill="rgba(14, 165, 233, 0.06)" /> {/* Doctor blob */}

              {/* Hand-drawn look Pencil Connective Paths with Arrowheads */}
              {/* Flow 1: Patient -> AI Engine */}
              <path d="M225 120 Q 300 100 375 110" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" />
              <path d="M370 105 L378 110 L370 115" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Flow 2: AI Engine -> Timeline Record */}
              <path d="M470 195 Q 400 280 230 355" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" />
              <path d="M236 360 L228 356 L234 350" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Flow 3: Timeline Record -> Doctor Workspace */}
              <path d="M235 400 Q 300 420 375 400" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round" />
              <path d="M370 395 L378 400 L370 405" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Flow 4: Doctor Workspace -> Patient Continuity (Completing the cycle) */}
              <path d="M450 315 Q 320 230 155 200" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 6" strokeLinecap="round" />
              <path d="M161 196 L153 200 L160 205" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

              {/* NODE 1: Patient at Home using WhatsApp (Top Left) */}
              <g transform="translate(50, 45)">
                {/* Hand-sketched Device Frame */}
                <rect x="10" y="10" width="130" height="150" rx="14" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />
                <rect x="16" y="16" width="118" height="120" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />

                {/* Chat Header */}
                <rect x="22" y="22" width="106" height="16" rx="4" fill="#e2e8f0" />
                <circle cx="30" cy="30" r="4" fill="#128c7e" /> {/* WhatsApp green dot */}
                <text x="38" y="34" fill="#334e68" fontSize="8" fontWeight="700">MediFlowAI Chat</text>

                {/* WhatsApp Message Bubble */}
                <path d="M26 62 h82 a6 6 0 0 1 6 6 v22 a6 6 0 0 1 -6 6 h-74 l-8 6 v-6 a6 6 0 0 1 -0 -0 z" fill="#dcf8c6" stroke="#94a3b8" strokeWidth="0.8" />
                <text x="32" y="74" fill="#075e54" fontSize="9" fontWeight="700">"Aaj ki sugar hai</text>
                <text x="32" y="86" fill="#075e54" fontSize="9" fontWeight="700">125"</text>

                {/* Subtext */}
                <text x="75" y="148" textAnchor="middle" fill="#00a389" fontSize="9.5" fontWeight="700">1. Natural Chat Update</text>
              </g>

              {/* NODE 2: AI Engine / Intelligent Processing (Top Right) */}
              <g transform="translate(390, 40)">
                {/* Circular Pencil Sketched Boundary */}
                <circle cx="75" cy="75" r="62" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />
                <circle cx="75" cy="75" r="54" fill="none" stroke="#e0f2fe" strokeWidth="3" strokeDasharray="4 4" />

                {/* Spark/AI Lines */}
                <path d="M75 35 L75 115 M35 75 L115 75" stroke="#93c5fd" strokeWidth="1" strokeDasharray="2 2" />

                {/* AI Central Icon */}
                <circle cx="75" cy="75" r="22" fill="#0080ff" stroke="#0066cc" strokeWidth="1" />
                <text x="75" y="79" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800">AI</text>

                {/* Extraction Badges */}
                <rect x="18" y="18" width="56" height="14" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.8" />
                <text x="46" y="28" textAnchor="middle" fill="#475569" fontSize="7" fontWeight="700">Glucose: 125</text>

                <rect x="80" y="116" width="50" height="14" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.8" />
                <text x="105" y="126" textAnchor="middle" fill="#475569" fontSize="7" fontWeight="700">Unit: mg/dL</text>

                <text x="75" y="152" textAnchor="middle" fill="#0080ff" fontSize="9.5" fontWeight="700">2. Structured by AI</text>
              </g>

              {/* NODE 3: Longitudinal Record Timeline (Bottom Left) */}
              <g transform="translate(55, 300)">
                {/* Timeline Card */}
                <rect x="10" y="10" width="135" height="150" rx="14" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />

                {/* Mini Graph Grid Lines */}
                <line x1="25" y1="100" x2="130" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="25" y1="75" x2="130" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="25" y1="50" x2="130" y2="50" stroke="#f1f5f9" strokeWidth="1" />

                {/* Hand-drawn Trendline */}
                <path d="M30 110 L60 92 L90 85 L120 65" stroke="#0080ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data Points */}
                <circle cx="30" cy="110" r="3.5" fill="#0080ff" stroke="#ffffff" strokeWidth="1" />
                <circle cx="60" cy="92" r="3.5" fill="#0080ff" stroke="#ffffff" strokeWidth="1" />
                <circle cx="90" cy="85" r="3.5" fill="#0080ff" stroke="#ffffff" strokeWidth="1" />
                <circle cx="120" cy="65" r="4.5" fill="#00a389" stroke="#ffffff" strokeWidth="1.5" />

                {/* Highlighting Normal Range Box */}
                <rect x="75" y="32" width="60" height="18" rx="4" fill="#e6f4ea" stroke="#137333" strokeWidth="0.8" />
                <text x="105" y="44" textAnchor="middle" fill="#137333" fontSize="7.5" fontWeight="700">125 mg/dL (Ok)</text>

                {/* Label */}
                <text x="77" y="148" textAnchor="middle" fill="#475569" fontSize="9.5" fontWeight="700">3. Built Automatically</text>
              </g>

              {/* NODE 4: Care Team Desktop Review (Bottom Right) */}
              <g transform="translate(390, 310)">
                {/* Desktop / Screen Sketch */}
                <rect x="10" y="10" width="130" height="110" rx="8" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />
                <rect x="15" y="15" width="120" height="85" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />

                {/* Screen Stand */}
                <path d="M60 120 L90 120 L75 130 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                <line x1="50" y1="130" x2="100" y2="130" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

                {/* Inside Screen Content - Dashboard Mock */}
                {/* Doctor Head Silhouette Sketch */}
                <circle cx="35" cy="40" r="12" fill="#e0f2fe" stroke="#0080ff" strokeWidth="0.8" />
                <path d="M23 60 C23 50, 47 50, 47 60 Z" fill="#e0f2fe" stroke="#0080ff" strokeWidth="0.8" />
                <text x="35" y="44" textAnchor="middle" fontSize="10" fill="#0080ff">🩺</text>

                {/* Mock Vitals Table Row */}
                <rect x="58" y="32" width="68" height="8" rx="3" fill="#e2e8f0" />
                <rect x="58" y="44" width="50" height="6" rx="2" fill="#cbd5e1" />
                <rect x="58" y="54" width="58" height="6" rx="2" fill="#cbd5e1" />

                {/* Passive Insight Capsule */}
                <rect x="24" y="74" width="102" height="16" rx="8" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="0.8" />
                <text x="75" y="85" textAnchor="middle" fill="#047857" fontSize="7.5" fontWeight="800">Zero Typing • Review Vitals</text>

                {/* Subtext */}
                <text x="75" y="138" textAnchor="middle" fill="#0f172a" fontSize="9.5" fontWeight="700">4. Doctors Just Review</text>
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
            Say goodbye to typing fatigue and complex portals. Our AI-driven engine organizes continuous health metrics behind the scenes.
          </p>

          <div className="pub-steps-grid">
            <div className="pub-step-card">
              <span className="pub-step-num">1</span>
              <div className="pub-step-icon">💬</div>
              <h3>Patient Updates Naturally</h3>
              <p>
                Patients send health updates naturally, such as <strong>"Aaj ki sugar hai 125"</strong> or <strong>"Weight 72 kg"</strong>, straight through a familiar WhatsApp chat interface.
              </p>
            </div>

            <div className="pub-step-card">
              <span className="pub-step-num">2</span>
              <div className="pub-step-icon">🧠</div>
              <h3>AI Comprehends Context</h3>
              <p>
                The MediFlowAI pipeline instantly extracts health parameters, values, and units, filtering noise and resolving relative dates (like "Today" or "Yesterday") accurately.
              </p>
            </div>

            <div className="pub-step-card">
              <span className="pub-step-num">3</span>
              <div className="pub-step-icon">📈</div>
              <h3>Timeline Builds Passively</h3>
              <p>
                Extracted metrics seamlessly map into the patient's continuous, structured health history. No manual form-filling, file uploads, or database logging required.
              </p>
            </div>

            <div className="pub-step-card">
              <span className="pub-step-num">4</span>
              <div className="pub-step-icon">👀</div>
              <h3>Read-Driven Health Trends</h3>
              <p>
                Authorized medical care teams and the patient view elegant, structured timelines and charts. Healthcare becomes continuous and review-focused, rather than entry-focused.
              </p>
            </div>
          </div>

          <div className="pub-philosophy-highlight">
            <span className="philosophy-icon">✨</span>
            <p className="philosophy-text">
              <strong>Our Core Philosophy:</strong> "Minimum input, maximum intelligence." We do not support complex encounter forms, active diagnoses, or manual prescription entry. Our platform strictly focuses on building longitudinal history automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Value Proposition Sections */}
      <section id="value" className="pub-section-value">
        <div className="pub-section-inner" style={{ marginBottom: "60px" }}>
          <h2 className="pub-section-title">Designed For the Healthcare Ecosystem</h2>
          <p className="pub-section-subtitle">
            Minimal overhead, zero-friction communication, and enterprise-grade data security integrated seamlessly.
          </p>
        </div>

        <div className="pub-value-grid">
          {/* For Patients */}
          <div id="for-patients" className="pub-value-card">
            <span className="pub-value-badge patient-badge">For Patients</span>
            <div className="pub-value-icon">👤</div>
            <h3>Build History Effortlessly</h3>
            <p>
              Log your health data naturally without downloading another bloated medical app or tracking paper slips. Check your structured logs, trends, clinical timelines, and care instructions securely in your browser anytime.
            </p>
            <ul className="pub-value-list">
              <li>• Send updates naturally via WhatsApp</li>
              <li>• Zero form-filling cognitive overhead</li>
              <li>• View organized trends and historic charts</li>
              <li>• Completely passive log collection</li>
            </ul>
            <div className="pub-value-safety-notice">
              ⚠️ MediFlowAI is an information organizer for health logs. It does not provide medical diagnoses or autonomous clinical decisions.
            </div>
          </div>

          {/* For Doctors */}
          <div id="for-doctors" className="pub-value-card">
            <span className="pub-value-badge doctor-badge">For Doctors</span>
            <div className="pub-value-icon">🩺</div>
            <h3>Less Data Entry. More Context.</h3>
            <p>
              Indian doctors consult dozens of patients daily and should not spend valuable time typing into complex EMR systems. MediFlowAI gives you a read-driven clinical workspace. Review clean longitudinal trends before you speak to your patient.
            </p>
            <ul className="pub-value-list">
              <li>• No administrative data entry during consults</li>
              <li>• Interactive patient vitals trends and logs</li>
              <li>• Fast, lightweight patient workspace lookup</li>
              <li>• Rich longitudinal insights at a single glance</li>
            </ul>
          </div>

          {/* For Hospitals */}
          <div id="for-hospitals" className="pub-value-card">
            <span className="pub-value-badge hospital-badge">For Hospitals</span>
            <div className="pub-value-icon">🏥</div>
            <h3>Structured, Isolated & Secure</h3>
            <p>
              Keep your care ecosystem aligned. MediFlowAI is a lightweight operational tool that connects patients and doctors securely, isolated strictly at the hospital tenant level.
            </p>
            <ul className="pub-value-list">
              <li>• Admin-controlled Doctor enrollment</li>
              <li>• Patient registration & doctor assignment</li>
              <li>• Secure role-based multi-tenant database</li>
              <li>• Lightweight operational statistics dashboard</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="pub-cta-section">
        <div className="pub-cta-inner">
          <h2 className="pub-cta-title">Health information should be easier to build.</h2>
          <p className="pub-cta-description">
            Experience the power of passive, self-building clinical history today. Access our secure portals to view your healthcare workspace.
          </p>
          <div className="pub-cta-actions">
            <button className="pub-btn-primary" onClick={onLoginClick}>Go to Portals</button>
            <button className="pub-btn-secondary" style={{ color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.4)" }} onClick={() => handleScrollTo("how-it-works")}>Learn More</button>
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
            &copy; {new Date().getFullYear()} MediFlowAI Platform. Built for medical clarity, patient compliance, and typing-free clinical workspaces.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicHome;
