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
      a: "Absolutely not. Doc2Me is a strict, read-driven intelligence organizer that builds structured longitudinal history. It does not make diagnostic claims, recommend medications, or make active clinical decisions. It serves to empower both patients and doctors with clear, organized factual data."
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
      {/* GLOBAL HEADER: Redesigned White/Frosted Glass Premium Navigation */}
      <header className={`premium-nav ${scrolled ? "premium-nav--scrolled" : ""}`}>
        <div className="premium-nav__container">
          <a href="#" className="premium-logo-wrap" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <img src="/images/branding/logo-horizontal.png" alt="Doc2Me Logo" className="premium-logo" />
          </a>

          <nav className="premium-nav-menu">
            <button onClick={() => handleScrollTo("companion-hero")} className="premium-nav-item">Companion</button>
            <button onClick={() => handleScrollTo("whatsapp-platform")} className="premium-nav-item">WhatsApp</button>
            <button onClick={() => handleScrollTo("smartest-way")} className="premium-nav-item">Campaign</button>
            <button onClick={() => handleScrollTo("consultation-hub")} className="premium-nav-item">Clinical</button>
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

      {/* SECTION 1A: REDESIGNED PITCH-INSPIRED HERO SECTION */}
      <section id="companion-hero" className="premium-section hero-pitch-section">
        {/* Soft colorful radial glows background */}
        <div className="hero-glow-layer">
          <div className="hero-glow glow-1" />
          <div className="hero-glow glow-2" />
          <div className="hero-glow glow-3" />
          <div className="hero-glow glow-4" />
        </div>

        {/* Low opacity floating background WhatsApp cards behind text */}
        <div className="hero-floating-cards">
          {/* Card 1: Patient message 1 */}
          <div className="floating-whatsapp-card wc-patient wc-1">
            <div className="wc-header">Patient</div>
            <div className="wc-body">Today's sugar 126 fasting.</div>
          </div>

          {/* Card 2: AI reply 1 */}
          <div className="floating-whatsapp-card wc-ai wc-2">
            <div className="wc-header">Doc2Me AI</div>
            <div className="wc-body">Sugar saved successfully.</div>
          </div>

          {/* Card 3: Patient message 2 - Hindi */}
          <div className="floating-whatsapp-card wc-patient wc-3">
            <div className="wc-header">Patient</div>
            <div className="wc-body">आज BP 128/82 है।</div>
          </div>

          {/* Card 4: AI reply 2 */}
          <div className="floating-whatsapp-card wc-ai wc-4">
            <div className="wc-header">Doc2Me AI</div>
            <div className="wc-body">Blood pressure recorded.</div>
          </div>

          {/* Card 5: Voice note */}
          <div className="floating-whatsapp-card wc-patient wc-5">
            <div className="wc-header">Patient</div>
            <div className="wc-body wc-voice">
              <span className="voice-play-btn">▶</span>
              <div className="voice-wave">
                <span className="bar bar-1"></span>
                <span className="bar bar-2"></span>
                <span className="bar bar-3"></span>
                <span className="bar bar-4"></span>
              </div>
              <span className="voice-duration">0:14</span>
            </div>
          </div>

          {/* Card 6: Image received */}
          <div className="floating-whatsapp-card wc-ai wc-6">
            <div className="wc-header">Doc2Me AI</div>
            <div className="wc-body wc-image">
              <svg className="wc-img-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Image analyzed.</span>
            </div>
          </div>

          {/* Card 7: Health value */}
          <div className="floating-whatsapp-card wc-health-val wc-7">
            <div className="wc-val-badge">BP 128/82</div>
            <div className="wc-val-status">Normal</div>
          </div>
        </div>

        <div className="premium-container hero-centered-content">
          <div className="editorial-tagline-badge">
            <span className="pulse-circle" />
            <span className="badge-label-text">WhatsApp-First Health Record Platform</span>
          </div>

          <h1 className="giant-hero-title">
            AI-powered WhatsApp <br />
            <span className="color-gradient-text">Health Record Platform</span>
          </h1>

          <p className="hero-editorial-subtext">
            No new apps to install. Just message your blood sugar, BP, weight, or voice notes straight to our secure AI companion to build structured, beautiful medical histories instantly.
          </p>

          <div className="hero-cta-group">
            <button className="cta-btn-primary" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
              Launch on WhatsApp
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="cta-btn-secondary" onClick={() => handleScrollTo("smartest-way")}>
              See How It Works
            </button>
          </div>

          <div className="hero-main-preview-wrapper">
            <img
              src="/images/hero/hero-main-platform.png"
              alt="AI Powered WhatsApp Platform Preview"
              className="hero-main-preview-img"
            />
          </div>
        </div>
      </section>

      {/* SECTION 1B: CONSECUTIVE HERO - AI WHATSAPP PLATFORM */}
      <section id="whatsapp-platform" className="premium-section hero-whatsapp-platform-section">
        <div className="section-decal-medical" />
        <div className="premium-container hero-grid-split">
          <div className="hero-artwork-composition">
            <div className="artwork-shadow-wrapper">
              <img
                src="/images/hero/hero-main-platform.png"
                alt="AI Powered WhatsApp Platform"
                className="artwork-img-full"
              />
            </div>
          </div>

          <div className="hero-text-composition">
            <div className="whatsapp-platform-meta">
              <span>ZERO-FRICTION LOGGING</span>
            </div>

            <h2 className="giant-hero-title">
              Built on the app <br />
              <span className="color-gradient-text" style={{ backgroundImage: "linear-gradient(135deg, var(--brand-green) 0%, var(--brand-blue) 100%)" }}>you already use.</span>
            </h2>

            <p className="hero-editorial-subtext">
              No new applications to install, no complicated dashboard widgets to learn. Simply message your readings, symptoms, or food journals straight to our secure AI-driven WhatsApp workspace.
            </p>

            <div className="hero-cta-group">
              <button className="cta-btn-primary" style={{ background: "linear-gradient(135deg, var(--brand-green) 0%, var(--brand-blue) 100%)", boxShadow: "0 6px 20px rgba(22, 163, 74, 0.2)" }} onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
                Connect to WhatsApp
              </button>
              <button className="cta-btn-secondary" onClick={() => handleScrollTo("smartest-way")}>
                See Clinical History
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE SMARTEST WAY (EDGE-TO-EDGE CAMPAIGN DOMINATION) */}
      <section id="smartest-way" className="premium-section campaign-smartest-way-section">
        <div className="premium-container">
          <div className="editorial-block-header">
            <span className="editorial-eyebrow">THE ULTIMATE LEDGER</span>
            <h2 className="editorial-headline">The smartest way to build health histories.</h2>
            <p className="editorial-paragraph">
              Allowing the artwork itself to tell the story of automatic progress, longitudinal graphs, and direct medical report parsing. Displayed cleanly, purely, and beautifully.
            </p>
          </div>

          <div className="edge-to-edge-campaign-container">
            <img
              src="/images/hero/hero-health-story.png"
              alt="The Smartest Way Health Story Campaign Poster"
              className="campaign-artwork-pure"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: WHATSAPP CONVERSATIONAL EXPERIENCE (HUMAN & CONVERSATIONAL) */}
      <section id="whatsapp-experience" className="premium-section whatsapp-conversational-section">
        <div className="premium-container conversational-grid">
          <div className="conversational-left">
            <img
              src="/images/features/feature-whatsapp-record.png"
              alt="Elderly WhatsApp Records"
              className="whatsapp-framed-artwork"
            />

            <div className="conversational-chat-simulation">
              <div className="chat-bubble-patient">
                Fasted sugar was 112 mg/dL. Yesterday night BP was 130 over 82.
              </div>
              <div className="chat-bubble-system">
                <h4>✓ Doc2Me AI Engine</h4>
                <p>Saved successfully. I have updated your timeline with Blood Sugar (Fasting) and Blood Pressure (130/82 mmHg).</p>
              </div>
            </div>
          </div>

          <div className="hero-text-composition">
            <span className="editorial-eyebrow" style={{ color: "var(--brand-green)" }}>HUMAN COMPANION</span>
            <h2 className="editorial-headline">Conversational medicine designed for compliance.</h2>
            <p className="editorial-paragraph" style={{ marginBottom: "28px" }}>
              Healthcare isn't built on rigid data tables; it's made of life. By accepting simple text clauses and natural voice inputs on WhatsApp, we provide older adults and busy parents an effortless way to keep accurate medical trends without tech hurdles.
            </p>

            <blockquote className="premium-quote-card">
              <p>
                “My father used to forget his glucose spreadsheets weekly. Now, he simply speaks to Doc2Me on WhatsApp, and the system coordinates everything for us.”
              </p>
              <cite>— Rajesh K., Bangalore (Caring for his 71-year-old father)</cite>
            </blockquote>
          </div>
        </div>
      </section>

      {/* SECTION 4: DEDICATED CLINICAL CONSULTATION SECTION */}
      <section id="consultation-hub" className="premium-section clinical-consultation-section">
        <div className="premium-container consultation-split">
          <div className="hero-text-composition">
            <span className="editorial-eyebrow">CLINICAL COLLABORATION</span>
            <h2 className="editorial-headline">Better consultations. Actionable records.</h2>
            <p className="editorial-paragraph">
              Doc2Me operates as an intelligent read-only clinical assistant. We compile longitudinal trend reports, high-resolution progress curves, and structured summaries so your practitioner is fully equipped with objective metrics the second you walk into the clinic.
            </p>
          </div>

          <div className="consultation-img-wrap">
            <img
              src="/images/features/feature-doctor-consultation.png"
              alt="Doctor Patient Consultation"
              className="consultation-artwork"
            />
          </div>
        </div>
      </section>

      {/* SECTION 5: FAMILY LOVE (EMOTIONAL & BRIGHT VIBRANT CARD PANELS) */}
      <section id="family-love" className="premium-section family-love-section">
        <div className="premium-container family-layout">
          <div className="family-cinematic-header">
            <span className="editorial-eyebrow" style={{ color: "var(--brand-orange)" }}>A CIRCLE OF EMOTIONAL CARE</span>
            <h2 className="editorial-headline">Keeping the family space completely unified.</h2>
            <p className="editorial-paragraph">
              Empower parents, safeguard pediatric logs, and coordinate geriatric wellness parameters with single-account routing. Connect multiple family profiles securely to ensure complete chronological clarity.
            </p>
          </div>

          <div className="family-artwork-frame">
            <div className="family-banner-meta">DESIGNED FOR EMPATHY</div>
            <img
              src="/images/features/feature-family-health.png"
              alt="Family Health Campaign"
              className="family-hero-img"
            />
          </div>
        </div>
      </section>

      {/* SECTION 6: GLOBAL HEALTHCARE (LIGHT-FILLED GLOBE HERO) */}
      <section id="global-vision" className="premium-section global-healthcare-section">
        <div className="premium-container global-grid">
          <div className="global-text-block">
            <span className="editorial-eyebrow">GLOBAL TELEMETRY</span>
            <h2 className="editorial-headline">Healthcare that understands you.</h2>
            <p className="editorial-paragraph">
              Language is not a barrier to health data. Our advanced parsing layers seamlessly recognize and categorize parameters across English, Devanagari Hindi, and phonetic Hinglish message patterns, ensuring absolute diagnostic terminology preservation.
            </p>

            <div className="global-stats-showcase">
              <div className="stat-item">
                <span className="stat-number-vibrant text-purple">3+</span>
                <span className="stat-sublabel">Supported Dialects</span>
              </div>
              <div className="stat-item">
                <span className="stat-number-vibrant text-blue">8</span>
                <span className="stat-sublabel">Vitals Logged</span>
              </div>
              <div className="stat-item">
                <span className="stat-number-vibrant text-orange">&lt;1s</span>
                <span className="stat-sublabel">Parsing Latency</span>
              </div>
            </div>
          </div>

          <div className="global-artwork-frame">
            <img
              src="/images/features/feature-global-health.png"
              alt="Global Healthcare Globe"
              className="global-globe-img"
            />
          </div>
        </div>
      </section>

      {/* SECTION 7: MARKETING BILLBOARD & PORTAL SHOWCASE */}
      <section className="premium-section marketing-showcase-section">
        <div className="premium-container">
          <div className="editorial-block-header">
            <span className="editorial-eyebrow">PLATFORM IN ACTION</span>
            <h2 className="editorial-headline">Designed for real-world visual impact.</h2>
            <p className="editorial-paragraph">
              From our clean interactive web companion dashboards to high-visibility physical community campaigns, we bring ultimate compliance and readability to families worldwide.
            </p>
          </div>

          <div className="marketing-canvas-grid">
            <div className="marketing-card">
              <span className="marketing-card-meta">01 / RESPONSIVE DIGITAL PORTAL</span>
              <img
                src="/images/marketing/marketing-website-preview.png"
                alt="Website Platform Companion Dashboard Preview"
                className="marketing-artwork-block"
              />
              <p className="marketing-card-caption">
                A highly polished, premium clinical dashboard designed with responsive grids and lightweight typography for quick and comfortable desktop reference.
              </p>
            </div>

            <div className="marketing-card">
              <span className="marketing-card-meta">02 / BILLBOARD & CAMPAIGN</span>
              <img
                src="/images/marketing/marketing-billboard.png"
                alt="Physical Campaign Billboard"
                className="marketing-artwork-block"
              />
              <p className="marketing-card-caption">
                Spreading clinical simplicity through direct physical billboards, making medical logging accessible to everyone without technical confusion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: PRICING & FAQS HUB */}
      <section id="pricing-hub" className="premium-section pricing-faq-hub-section">
        <div className="premium-container">
          <div className="editorial-block-header">
            <span className="editorial-eyebrow">SIMPLE PLANS</span>
            <h2 className="editorial-headline">Flexible engagement of all healthcare scales.</h2>
            <p className="editorial-paragraph">
              Start recording vitals absolutely free on WhatsApp. Upgrade effortlessly to get full family profiles, unlimited voice message logging, and OCR report scans.
            </p>
          </div>

          <div className="pricing-deck-layout">
            <div className="premium-pricing-card">
              <div className="card-top-content">
                <span className="tier-title">Patient Lite</span>
                <div className="tier-pricing-row">
                  <span className="currency-sym">$</span>
                  <span className="price-num">0</span>
                  <span className="time-period">/mo</span>
                </div>
                <p className="tier-caption-text">Perfect for initiating basic individual clinical tracking logs.</p>
              </div>
              <div className="card-hairline" />
              <ul className="tier-feature-list">
                <li>✔ Up to 30 WhatsApp logs / month</li>
                <li>✔ 2 Canonical physiological parameters</li>
                <li>✔ Standard 30-day dashboard trends</li>
                <li>✔ Secure login & database isolation</li>
                <li className="disabled-bullet">✕ Advanced Lab OCR scans</li>
                <li className="disabled-bullet">✕ Voice message transcriptions</li>
                <li className="disabled-bullet">✕ Shared Doctor workspace integration</li>
              </ul>
              <button className="price-cta-secondary" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
                Start Logging Free
              </button>
            </div>

            <div className="premium-pricing-card featured-price-card">
              <div className="popular-ribbon">MOST POPULAR</div>
              <div className="card-top-content">
                <span className="tier-title" style={{ color: "var(--brand-purple)" }}>Patient Premium</span>
                <div className="tier-pricing-row">
                  <span className="currency-sym">$</span>
                  <span className="price-num">9</span>
                  <span className="time-period">/mo</span>
                </div>
                <p className="tier-caption-text">Comprehensive, unlimited recording with family profile routing.</p>
              </div>
              <div className="card-hairline" />
              <ul className="tier-feature-list">
                <li>✔ Unlimited WhatsApp text & voice logs</li>
                <li>✔ Track all 8 Canonical parameters</li>
                <li>✔ Unlimited AI Health Insights & GPT summaries</li>
                <li>✔ Document OCR scans (Up to 15 reports/mo)</li>
                <li>✔ Multi-profile family routing (3 members)</li>
                <li>✔ Real-time clinical timeline exporter</li>
                <li>✔ High priority chat queue and support</li>
              </ul>
              <button className="price-cta-primary" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
                Start 7-Day Free Trial
              </button>
            </div>

            <div className="premium-pricing-card">
              <div className="card-top-content">
                <span className="tier-title">Enterprise / Practice</span>
                <div className="tier-pricing-row">
                  <span className="price-num" style={{ fontSize: "40px" }}>Custom</span>
                </div>
                <p className="tier-caption-text">Collaborative portals for clinics, physicians, and care teams.</p>
              </div>
              <div className="card-hairline" />
              <ul className="tier-feature-list">
                <li>✔ Unlimited assigned patient profiles</li>
                <li>✔ Specialized Clinical Workspace overlays</li>
                <li>✔ Secure multi-tenant hospital partitioning</li>
                <li>✔ Automated patient compliance reports</li>
                <li>✔ Custom SMS / WhatsApp campaign outreach</li>
                <li>✔ API integration into existing EMR/EHR</li>
                <li>✔ Dedicated account manager & support</li>
              </ul>
              <button className="price-cta-secondary" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
                Contact Hospital Sales
              </button>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div id="faq-accordion" className="editorial-faq-block">
            <div className="editorial-block-header" style={{ marginBottom: "40px" }}>
              <span className="editorial-eyebrow">COMMON QUESTIONS</span>
              <h2 className="editorial-headline" style={{ fontSize: "42px" }}>Frequently Asked Questions</h2>
            </div>

            <div className="accordion-container-width">
              {faqData.map((item, index) => {
                const isOpen = activeFAQ === index;
                return (
                  <div key={index} className={`faq-card-item ${isOpen ? "faq-card-item--active" : ""}`}>
                    <button className="faq-trigger-btn" onClick={() => setActiveFAQ(isOpen ? null : index)}>
                      <span>{item.q}</span>
                      <span className="faq-accordion-arrow">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && (
                      <div className="faq-answer-body">
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
        <div className="premium-container">
          <h2 className="outbound-headline">Ready to change how you keep records?</h2>
          <p className="outbound-editorial-copy">
            Join thousands of patients and leading practitioners who are experiencing a frictionless clinical timeline. Connect your WhatsApp profile in under 30 seconds.
          </p>

          <div className="outbound-cta-row">
            <button className="outbound-btn-main" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
              Create Your Free Account
            </button>
            <button className="outbound-btn-outline" onClick={() => handleScrollTo("companion-hero")}>
              Learn the Science
            </button>
          </div>
        </div>
      </section>

      {/* LARGE EDITORIAL BRAND FOOTER */}
      <footer className="premium-editorial-footer">
        <div className="premium-container">
          <div className="footer-top-layout">
            <div className="footer-identity-card">
              <img src="/images/branding/logo-horizontal.png" alt="Doc2Me Brand Logo" className="footer-brand-img" />
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
                <button onClick={() => handleScrollTo("companion-hero")} className="footer-nav-link-btn">Companion</button>
                <button onClick={() => handleScrollTo("whatsapp-platform")} className="footer-nav-link-btn">WhatsApp</button>
                <button onClick={() => handleScrollTo("smartest-way")} className="footer-nav-link-btn">Campaign</button>
                <button onClick={() => handleScrollTo("pricing-hub")} className="footer-nav-link-btn">Pricing Plans</button>
              </div>

              <div className="footer-nav-col">
                <h4>Use Cases</h4>
                <button onClick={() => handleScrollTo("family-love")} className="footer-nav-link-btn">Family Coordination</button>
                <button onClick={() => handleScrollTo("consultation-hub")} className="footer-nav-link-btn">For Care Teams</button>
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
