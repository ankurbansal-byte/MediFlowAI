import React, { useState, useEffect } from "react";
import "./HomepagePremium.css";

interface HomepagePremiumProps {
  onLoginClick?: () => void;
}

const HomepagePremium: React.FC<HomepagePremiumProps> = ({ onLoginClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState(false);

  // Monitor scroll for premium header transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setSubmittedEmail(true);
      setEmailInput("");
      setTimeout(() => setSubmittedEmail(false), 5000);
    }
  };

  const faqData = [
    {
      q: "How does Doc2Me extract records from a simple WhatsApp message?",
      a: "Doc2Me uses a state-of-the-art dual clinical translation layer. When you type or voice-record details like 'sugar 120 empty stomach' or '130/80 BP', our Universal Synonym and Medical Entity engines isolate parameters, clinical values, and timeline tags. It processes English, Hindi, and Hinglish seamlessly without needing forms."
    },
    {
      q: "Does Doc2Me replace my doctor or make diagnoses?",
      a: "Absolutely not. Doc2Me is a strict, read-driven intelligence organizer that builds structured longitudinal history. It does not make diagnostic claims, recommend medications, or make autonomous clinical decisions. It serves to empower both patients and doctors with clear, organized factual data."
    },
    {
      q: "Is my medical data safe and isolated?",
      a: "Security is our core foundation. Patient and hospital tenant bounds are strictly enforced at the database level. Data is encrypted in transit and at rest. We maintain an audited, zero-retention policy for temporary files (like transcribed voice records or lab documents) and verify access based on authenticated WhatsApp metadata."
    },
    {
      q: "Can I upload lab reports and scanned documents too?",
      a: "Yes! With our Document Intelligence V1 pipeline, you can snap a picture or send a PDF of your laboratory reports (such as blood tests, thyroid profiles, or HbA1c panels). Doc2Me cleans adjacent lines, maps the parameters to proper reference ranges, and lists them on your timeline automatically."
    }
  ];

  return (
    <div className="homepage-premium-canvas">
      {/* Decorative Parallax Background Decals */}
      <div className="premium-decal planes-left" style={{ backgroundImage: "url('/images/backgrounds/bg-floating-paper-planes.png')" }} />
      <div className="premium-decal medical-right" style={{ backgroundImage: "url('/images/backgrounds/bg-floating-medical-elements.png')" }} />

      {/* HEADER SECTION: Redesigned Dark Premium Navigation */}
      <header className={`premium-nav ${scrolled ? "premium-nav--scrolled" : ""}`}>
        <div className="premium-nav__container">
          <a href="#" className="premium-logo-wrap" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <img src="/images/branding/logo-horizontal.png" alt="Doc2Me Logo" className="premium-logo" />
          </a>

          <nav className="premium-nav-menu">
            <button onClick={() => handleScrollTo("health-story")} className="premium-nav-item">Campaign</button>
            <button onClick={() => handleScrollTo("whatsapp-experience")} className="premium-nav-item">WhatsApp</button>
            <button onClick={() => handleScrollTo("doctor-narrative")} className="premium-nav-item">Clinical</button>
            <button onClick={() => handleScrollTo("family-love")} className="premium-nav-item">Family</button>
            <button onClick={() => handleScrollTo("global-vision")} className="premium-nav-item">Global</button>
            <button onClick={() => handleScrollTo("pricing-hub")} className="premium-nav-item">Pricing</button>
            <button onClick={() => handleScrollTo("faq-accordion")} className="premium-nav-item">FAQ</button>
          </nav>

          <div className="premium-nav-actions">
            <button className="premium-btn-text" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
              Login
            </button>
            <button className="premium-btn-nav" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
              Launch App
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: HERO CAMPAIGN - Massive scale, cinematic presentation */}
      <section className="premium-section hero-campaign">
        <div className="hero-radial-bg" />
        <div className="hero-grid-decor" />
        <div className="premium-container hero-flex-container">
          <div className="hero-text-composition">
            <div className="brand-badge-pill animate-fade-in">
              <span className="brand-pulse-dot" />
              <span className="brand-badge-text">Doc2Me Intelligent Core</span>
            </div>

            <h1 className="hero-main-title">
              Health records that <br />
              <span className="gradient-highlight">build themselves.</span>
            </h1>

            <p className="hero-subheading">
              A premium AI-driven workspace changing the nature of health records. No forms. No typing. Simply chat through WhatsApp voice notes, clinical reports, and raw texts.
            </p>

            <div className="hero-interactive-row">
              <button className="cta-button-main ripple-effect" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
                Start in 30 Seconds
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="cta-button-secondary" onClick={() => handleScrollTo("health-story")}>
                Explore the Platform
              </button>
            </div>

            <div className="hero-storytelling-quote">
              <span className="quote-decorative">“</span>
              No software application to install. Just message naturally as you would with your family.
            </div>
          </div>

          <div className="hero-artwork-frame animate-scale-in">
            <div className="artwork-card-wrapper">
              <img
                src="/images/hero/hero-main-platform.png"
                alt="Doc2Me Main Platform Interface"
                className="hero-main-img"
              />
              <div className="glow-shadow-accent" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: HEALTH STORY - Campaign Poster Treatment */}
      <section id="health-story" className="premium-section health-story-campaign">
        <div className="story-bg-overlay" />
        <div className="premium-container text-center">
          <div className="editorial-eyebrow">THE SCIENCE OF DISCOVERY</div>
          <h2 className="editorial-title text-white">The smartest way to build health histories.</h2>
          <p className="editorial-subtitle text-gray-light">
            We've removed the manual database form. Doc2Me parses conversational elements, captures multi-month trends, and maps vital clinical context synchronously in the background.
          </p>

          <div className="campaign-poster-wrapper animate-reveal">
            <img
              src="/images/hero/hero-health-story.png"
              alt="Intelligent health analysis map"
              className="campaign-poster-img"
            />
            <div className="campaign-poster-caption">
              <span>01 / INTELLIGENT CLINICAL CLARITY</span>
              <p>Continuous physiological mapping, automatically generated without friction.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: WHATSAPP EXPERIENCE - The Elderly Gentleman Storytelling Frame */}
      <section id="whatsapp-experience" className="premium-section whatsapp-storytelling">
        <div className="whatsapp-grid-decor" />
        <div className="premium-container whatsapp-layout-grid">
          <div className="whatsapp-artwork-container">
            <img
              src="/images/features/feature-whatsapp-record.png"
              alt="Elderly WhatsApp Experience"
              className="whatsapp-artwork-img"
            />
            <div className="whatsapp-artwork-decor-circle" />
          </div>

          <div className="whatsapp-text-composition">
            <div className="editorial-eyebrow color-orange">CONVERSATIONAL UTILITY</div>
            <h2 className="editorial-title color-dark">Empowering parents. Saving generations.</h2>
            <p className="editorial-body">
              For seniors who struggle with complex healthcare applications, keeping logs feels like an administrative burden. With Doc2Me, there is zero technology to learn. They talk, whisper, or text their vitals directly into WhatsApp.
            </p>

            <blockquote className="premium-quote-card">
              <p>
                “My father used to lose his paper glucose charts weekly. Now he just whispers his readings into WhatsApp, and the system organizes it instantly.”
              </p>
              <cite>— Rajesh K., Bangalore (Caring for his 71-year-old father)</cite>
            </blockquote>
          </div>
        </div>
      </section>

      {/* SECTION 4: CLINICAL NARRATIVE - Editorial Storytelling for Clinicians */}
      <section id="doctor-narrative" className="premium-section doctor-campaign-narrative">
        <div className="doctor-radial-glow" />
        <div className="premium-container text-center">
          <div className="editorial-eyebrow color-indigo">CLINICAL PRECISION</div>
          <h2 className="editorial-title color-dark">Eliminating documentation fatigue.</h2>
          <p className="editorial-subtitle">
            Doc2Me acts as a read-driven, non-diagnosing assistant. Practitioners review beautifully organized factual trends and timelines directly before patient cabin visits.
          </p>
        </div>

        <div className="premium-container doctor-images-grid">
          <div className="doctor-artwork-poster hover-scale">
            <div className="poster-meta">CASE STUDY A / THE WORKSPACE</div>
            <img
              src="/images/hero/hero-doctor.png"
              alt="Doctor clinical dashboard"
              className="doctor-artwork-img-block"
            />
            <div className="poster-caption">
              <h3>Longitudinal Clinical Workspace</h3>
              <p>Continuous patient vitals mapping and structured progress insights delivered securely with high-contrast, beautiful readability.</p>
            </div>
          </div>

          <div className="doctor-artwork-poster hover-scale">
            <div className="poster-meta">CASE STUDY B / OUTPATIENT FLOW</div>
            <img
              src="/images/features/feature-doctor-consultation.png"
              alt="Doctor patient consultation"
              className="doctor-artwork-img-block"
            />
            <div className="poster-caption">
              <h3>Active Consultation Integration</h3>
              <p>Eliminate consultation overheads. Empower care teams with complete chronological clarity without typing on bulky database fields.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: FAMILY LOVE CAMPAIGN - Major Visual Screen Domination */}
      <section id="family-love" className="premium-section family-emotional-campaign">
        <div className="family-gradient-backdrop" />
        <div className="premium-container family-layout">
          <div className="family-cinematic-header text-center">
            <div className="editorial-eyebrow text-white">HUMAN CONNECTION</div>
            <h2 className="editorial-title text-white">The family health space, unified.</h2>
            <p className="editorial-subtitle text-gray-light">
              We design technology for those you care about most. Safeguard pediatric development, track maternal vitals, and coordinate geriatric oversight under a single WhatsApp number.
            </p>
          </div>

          <div className="family-cinematic-artwork animate-glow-up">
            <img
              src="/images/features/feature-family-health.png"
              alt="Family health campaign poster"
              className="family-hero-artwork"
            />
            <div className="artwork-overlay-meta">
              <span>DESIGNED FOR EMPATHY & CARE</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: GLOBAL HEALTHCARE - Immersive Dark Orbital Space */}
      <section id="global-vision" className="premium-section global-orbital-campaign">
        <div className="global-spheres-bg" />
        <div className="premium-container global-layout-grid">
          <div className="global-text-block">
            <div className="editorial-eyebrow color-orange">GLOBAL TELEMETRY</div>
            <h2 className="editorial-title text-white">Healthcare doesn't speak one language.</h2>
            <p className="editorial-subtitle text-gray-light text-left">
              Our advanced clinical language parsing layers natively recognize, interpret, and process medical readings across English, Hindi script, and conversational Hinglish formats.
            </p>

            <div className="global-stats-showcase">
              <div className="stat-pill">
                <span className="stat-number text-gradient-orange">3+</span>
                <span className="stat-label">Supported Dialects</span>
              </div>
              <div className="stat-pill">
                <span className="stat-number text-gradient-blue">8</span>
                <span className="stat-label">Vitals Tracked</span>
              </div>
              <div className="stat-pill">
                <span className="stat-number text-gradient-purple">&lt;1s</span>
                <span className="stat-label">Comprehension Latency</span>
              </div>
            </div>
          </div>

          <div className="global-visual-block">
            <img
              src="/images/features/feature-global-health.png"
              alt="Global Healthcare Sphere"
              className="global-sphere-artwork"
            />
            <div className="orbital-halo" />
          </div>
        </div>
      </section>

      {/* SECTION 7: MARKETING BILLBOARD & PLATFORM SHOWCASE */}
      <section className="premium-section marketing-cinematic-showcase">
        <div className="marketing-skew-decor" />
        <div className="premium-container text-center">
          <div className="editorial-eyebrow color-indigo">CAMPAIGN SHOWCASE</div>
          <h2 className="editorial-title color-dark">A visual platform designed for impact.</h2>
          <p className="editorial-subtitle">
            From physical presence to clean digital layouts, Doc2Me brings empathy and absolute simplicity to real-world healthcare administration.
          </p>
        </div>

        <div className="premium-container marketing-split-canvas">
          <div className="marketing-canvas-block hover-lift">
            <div className="canvas-header-meta">DIGITAL SURFACE PLATFORM</div>
            <img
              src="/images/marketing/marketing-website-preview.png"
              alt="Doc2Me Platform Marketing Showcase"
              className="marketing-high-res"
            />
            <p className="marketing-canvas-caption">
              A meticulously designed, highly responsive patient dashboard built to eliminate clutter and provide comfortable visual breathing room.
            </p>
          </div>

          <div className="marketing-canvas-block hover-lift">
            <div className="canvas-header-meta">PHYSICAL CAMPAIGN & BILLBOARD</div>
            <img
              src="/images/marketing/marketing-billboard.png"
              alt="Doc2Me Marketing Billboard campaign"
              className="marketing-high-res"
            />
            <p className="marketing-canvas-caption">
              Doc2Me campaigns target clinical simplicity in the physical world. Redefining modern care tracking for communities globally.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 8: PRICING & FAQS */}
      <section id="pricing-hub" className="premium-section pricing-and-faq-hub">
        <div className="hub-cream-backdrop" />
        <div className="premium-container">
          <div className="section-header text-center">
            <div className="editorial-eyebrow color-orange">FLEXIBLE ENGAGEMENT</div>
            <h2 className="editorial-title color-dark">Empowering health journeys of all scales.</h2>
            <p className="editorial-subtitle">
              Start logging your clinical measurements for free. Scale easily with automated lab documents analysis, voice parsing, and multi-profile patient workspaces.
            </p>
          </div>

          <div className="premium-pricing-deck">
            <div className="premium-price-card">
              <div className="card-top">
                <span className="tier-name">Patient Lite</span>
                <div className="tier-price">
                  <span className="currency">$</span>
                  <span className="price">0</span>
                  <span className="period">/mo</span>
                </div>
                <p className="tier-caption">Perfect for starting basic daily vitals tracking on a single account.</p>
              </div>
              <div className="card-divider" />
              <ul className="tier-bullets">
                <li>✔ Up to 30 WhatsApp logs / month</li>
                <li>✔ 2 Canonical physiological parameters</li>
                <li>✔ Standard 30-day dashboard trends</li>
                <li>✔ Secure login & database isolation</li>
                <li className="bullet-disabled">✕ Advanced Lab OCR scans</li>
                <li className="bullet-disabled">✕ Voice message transcriptions</li>
                <li className="bullet-disabled">✕ Shared Doctor workspace integration</li>
              </ul>
              <button className="pricing-cta-button-secondary" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
                Start Logging Free
              </button>
            </div>

            <div className="premium-price-card featured-price-card">
              <div className="featured-ribbon-tag">MOST POPULAR</div>
              <div className="card-top">
                <span className="tier-name color-indigo">Patient Premium</span>
                <div className="tier-price">
                  <span className="currency">$</span>
                  <span className="price">9</span>
                  <span className="period">/mo</span>
                </div>
                <p className="tier-caption text-gray-dark">Comprehensive, unlimited recording with multi-profile family routing.</p>
              </div>
              <div className="card-divider" />
              <ul className="tier-bullets text-gray-dark">
                <li>✔ Unlimited WhatsApp text & voice logs</li>
                <li>✔ Track all 8 Canonical parameters</li>
                <li>✔ Unlimited AI Health Insights & GPT summaries</li>
                <li>✔ Document OCR scans (Up to 15 reports/mo)</li>
                <li>✔ Multi-profile family routing (3 members)</li>
                <li>✔ Real-time clinical timeline exporter</li>
                <li>✔ High priority chat queue and support</li>
              </ul>
              <button className="pricing-cta-button-primary" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
                Start 7-Day Free Trial
              </button>
            </div>

            <div className="premium-price-card">
              <div className="card-top">
                <span className="tier-name">Enterprise / Practice</span>
                <div className="tier-price">
                  <span className="price">Custom</span>
                </div>
                <p className="tier-caption">Custom workspaces for clinics, practitioners, and large medical networks.</p>
              </div>
              <div className="card-divider" />
              <ul className="tier-bullets">
                <li>✔ Unlimited assigned patient profiles</li>
                <li>✔ Specialized Clinical Workspace overlays</li>
                <li>✔ Secure multi-tenant hospital partitioning</li>
                <li>✔ Automated patient compliance reports</li>
                <li>✔ Custom SMS / WhatsApp campaign outreach</li>
                <li>✔ API integration into existing EMR/EHR</li>
                <li>✔ Dedicated account manager & SLA support</li>
              </ul>
              <button className="pricing-cta-button-secondary" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
                Contact Hospital Sales
              </button>
            </div>
          </div>

          {/* FAQ Accordion embedded in Hub */}
          <div id="faq-accordion" className="premium-faq-section">
            <div className="text-center">
              <div className="editorial-eyebrow color-indigo">COMMON QUESTIONS</div>
              <h2 className="editorial-title color-dark">Frequently Asked Questions</h2>
            </div>

            <div className="premium-accordion-wrapper">
              {faqData.map((item, index) => {
                const isOpen = activeFAQ === index;
                return (
                  <div key={index} className={`premium-faq-item ${isOpen ? "premium-faq-item--active" : ""}`}>
                    <button className="premium-faq-header" onClick={() => setActiveFAQ(isOpen ? null : index)}>
                      <span>{item.q}</span>
                      <span className="accordion-icon-trigger">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && (
                      <div className="premium-faq-body">
                        <p>{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL HIGH-IMPACT OUTBOUND CTA */}
      <section className="premium-section outbound-cinematic-cta">
        <div className="outbound-gradient-mask" />
        <div className="premium-container text-center relative-z">
          <h2 className="outbound-heading">Ready to transform your healthcare records?</h2>
          <p className="outbound-subtitle">
            Join thousands of patients and leading clinicians who are already experiencing continuous, typing-free longitudinal history. Send your first WhatsApp vital in under 30 seconds.
          </p>

          <div className="outbound-buttons">
            <button className="outbound-btn-main" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
              Create Your Free Account
            </button>
            <button className="outbound-btn-outline" onClick={() => handleScrollTo("health-story")}>
              Learn the Science
            </button>
          </div>
        </div>
      </section>

      {/* LARGE EDITORIAL BRAND FOOTER */}
      <footer className="premium-editorial-footer">
        <div className="premium-container">
          <div className="footer-top-layout">
            <div className="footer-identity">
              <img src="/images/branding/logo-horizontal.png" alt="Doc2Me Brand horizontal Logo" className="footer-brand-img" />
              <p className="footer-tagline-text">
                The leading AI-powered WhatsApp health Companion & clinical document intelligence platform.
              </p>
              <div className="footer-social-tray">
                <a href="#twitter" aria-label="Twitter" className="footer-social-icon">𝕏</a>
                <a href="#linkedin" aria-label="LinkedIn" className="footer-social-icon">in</a>
                <a href="#github" aria-label="GitHub" className="footer-social-icon">git</a>
                <a href="#youtube" aria-label="YouTube" className="footer-social-icon">yt</a>
              </div>
            </div>

            <div className="footer-navigation-columns">
              <div className="footer-nav-col">
                <h4>Platform</h4>
                <button onClick={() => handleScrollTo("health-story")} className="footer-nav-link-btn">Campaign</button>
                <button onClick={() => handleScrollTo("whatsapp-experience")} className="footer-nav-link-btn">WhatsApp</button>
                <button onClick={() => handleScrollTo("doctor-narrative")} className="footer-nav-link-btn">Clinical</button>
                <button onClick={() => handleScrollTo("pricing-hub")} className="footer-nav-link-btn">Pricing Plans</button>
              </div>

              <div className="footer-nav-col">
                <h4>Use Cases</h4>
                <button onClick={() => handleScrollTo("family-love")} className="footer-nav-link-btn">Family Coordination</button>
                <button onClick={() => handleScrollTo("doctor-narrative")} className="footer-nav-link-btn">For Care Teams</button>
                <a href="#hospitals" className="footer-nav-link-item">Hospital Networks</a>
                <a href="#diabetes" className="footer-nav-link-item">Diabetes Tracking</a>
              </div>

              <div className="footer-nav-col">
                <h4>Resources</h4>
                <button onClick={() => handleScrollTo("faq-accordion")} className="footer-nav-link-btn">FAQ Helpdesk</button>
                <a href="#safety-limits" className="footer-nav-link-item">Clinical Safety</a>
                <a href="#privacy" className="footer-nav-link-item">Data Privacy</a>
                <a href="#api" className="footer-nav-link-item">Developer API</a>
              </div>

              <div className="footer-nav-col">
                <h4>Newsletter</h4>
                <p className="newsletter-caption">Stay updated on continuous clinical telemetry advancements.</p>
                <form className="newsletter-submission-box" onSubmit={handleNewsletterSubmit}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="newsletter-text-field"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                  <button type="submit" className="newsletter-submit-button">→</button>
                </form>
                {submittedEmail && (
                  <span className="newsletter-status-message">✔ Subscribed successfully!</span>
                )}
              </div>
            </div>
          </div>

          <div className="footer-clinical-disclaimer">
            <p>
              <strong>Clinical Telemetry Organizer Disclaimer:</strong> Doc2Me is a secure metadata tracking and health information organizer. It operates as a read-driven, continuous ledger of manual logs, voice inputs, and optical characters parsed from laboratory documentation. Doc2Me does NOT issue diagnoses, recommend therapeutic interventions, formulate active prescription guidance, or act as an autonomous clinical decision provider. All calculated telemetry, stats, and AI summary insights should be audited directly by licensed medical practitioners during active consultations.
            </p>
          </div>

          <div className="footer-bottom-bar">
            <p className="copyright-info">
              &copy; {new Date().getFullYear()} Doc2Me Platform. All rights reserved. Built for typing-free clinical workspaces, high patient compliance, and chronological clarity.
            </p>
            <div className="footer-bottom-links">
              <a href="#privacy" className="footer-bottom-link">Privacy Policy</a>
              <span className="separator-bullet">•</span>
              <a href="#terms" className="footer-bottom-link">Terms of Service</a>
              <span className="separator-bullet">•</span>
              <a href="#contact" className="footer-bottom-link">Contact Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomepagePremium;
