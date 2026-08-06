import React, { useState, useEffect } from "react";
import "./HomepageV1.css";

interface HomepageV1Props {
  onLoginClick?: () => void;
}

const HomepageV1: React.FC<HomepageV1Props> = ({ onLoginClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState(false);

  // Monitor scroll for navbar styles
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
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
      element.scrollIntoView({ behavior: "smooth" });
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
    <div className="homepage-v1-canvas">
      {/* Background Decor Layer - Floating Paper Planes & Medical elements across multiple sections */}
      <div className="bg-decal paper-planes-decal" style={{ backgroundImage: "url('/images/backgrounds/bg-floating-paper-planes.png')" }} />
      <div className="bg-decal medical-elements-decal" style={{ backgroundImage: "url('/images/backgrounds/bg-floating-medical-elements.png')" }} />

      {/* NAVBAR */}
      <header className={`hp-navbar ${scrolled ? "hp-navbar--scrolled" : ""}`}>
        <div className="hp-navbar__container">
          <a href="#" className="hp-logo-wrap" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <img src="/images/branding/logo-primary.png" alt="Doc2Me Logo" className="hp-logo" />
            <span className="hp-logo-text">Doc2Me</span>
          </a>

          <nav className="hp-nav-links">
            <button onClick={() => handleScrollTo("why-us")} className="hp-nav-item">Why Doc2Me</button>
            <button onClick={() => handleScrollTo("how-it-works")} className="hp-nav-item">How It Works</button>
            <button onClick={() => handleScrollTo("features")} className="hp-nav-item">Features</button>
            <button onClick={() => handleScrollTo("family")} className="hp-nav-item">For Family</button>
            <button onClick={() => handleScrollTo("doctors")} className="hp-nav-item">For Doctors</button>
            <button onClick={() => handleScrollTo("pricing")} className="hp-nav-item">Pricing</button>
            <button onClick={() => handleScrollTo("faq")} className="hp-nav-item">FAQ</button>
          </nav>

          <div className="hp-nav-actions">
            <button className="hp-btn hp-btn--text" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
              Login
            </button>
            <button className="hp-btn hp-btn--primary" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
              Sign Up Free
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hp-hero">
        <div className="hp-hero__glow" />
        <div className="hp-hero__container">
          <div className="hp-hero__content">
            <div className="hp-badge">
              <span className="hp-badge__dot"></span>
              <span className="hp-badge__text">The Smartest AI WhatsApp Companion</span>
            </div>

            <h1 className="hp-hero__title">
              Health records that <br />
              <span className="text-gradient">build themselves.</span>
            </h1>

            <p className="hp-hero__subtitle">
              Doc2Me transforms raw WhatsApp texts, voice notes, and lab reports into structured longitudinal clinical timelines. Zero forms, zero manual entry, total clarity.
            </p>

            <div className="hp-hero__actions">
              <button className="hp-btn hp-btn--lg hp-btn--primary" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
                Start in 30 Seconds
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="hp-btn hp-btn--lg hp-btn--secondary" onClick={() => handleScrollTo("how-it-works")}>
                See How It Works
              </button>
            </div>

            {/* Handwritten overlay quote element for emotional design */}
            <div className="hp-handwritten-quote">
              "No medical apps to download. Just chat like you do with family."
            </div>

            <div className="hp-hero__vitals-badge">
              <div className="badge-item">
                <span className="badge-val">99.8%</span>
                <span className="badge-lbl">Accuracy</span>
              </div>
              <div className="badge-divider" />
              <div className="badge-item">
                <span className="badge-val">Multi-Lingual</span>
                <span className="badge-lbl">English, Hindi, Hinglish</span>
              </div>
            </div>
          </div>

          <div className="hp-hero__visual">
            <div className="hp-visual-container">
              {/* Massive Main Platform Mockup */}
              <img
                src="/images/hero/hero-main-platform.png"
                alt="Doc2Me Main Platform Interface"
                className="hp-hero-image"
              />
              <div className="hp-image-shadow" />
            </div>
          </div>
        </div>
      </section>

      {/* STORYTELLING BLOCK - Immediately below Hero */}
      <section className="hp-storyteller">
        <div className="hp-storyteller__container">
          <div className="story-grid">
            <div className="story-image-block">
              <img
                src="/images/hero/hero-health-story.png"
                alt="Patient story and health path"
                className="story-large-img"
              />
            </div>
            <div className="story-content-block">
              <div className="vertical-accent-line">STORYTELLING</div>
              <h2 className="story-title">From a single text to a lifelong health history.</h2>
              <p className="story-paragraph">
                Managing chronic conditions shouldn't feel like a data-entry job. Whether tracking blood sugar levels across meals, graphing multi-month blood pressure trends, or cataloging pediatric weight metrics, Doc2Me turns unstructured daily check-ins into structured, medical-grade telemetry.
              </p>
              <p className="story-paragraph italic">
                “My father used to lose his paper charts weekly. Now he just whispers his vitals into WhatsApp, and both he and I can track everything in real-time.”
              </p>
              <div className="story-quote-by">— Rajesh K., Bangalore (Caring for his 71-year-old father)</div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY DOC2ME */}
      <section id="why-us" className="hp-why">
        <div className="hp-why__container">
          <div className="section-header text-center">
            <span className="section-tag">THE DOC2ME EDGE</span>
            <h2 className="section-heading">Minimum Input. Maximum Intelligence.</h2>
            <p className="section-subtext">
              We designed Doc2Me to fit into your existing lifestyle. We do not require complex portals or behavioral changes—just continuous history built automatically.
            </p>
          </div>

          <div className="hp-why-grid">
            <div className="hp-why-card hover-lift">
              <div className="card-icon-wrapper bg-orange">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3 className="why-card-title">Frictionless Messaging</h3>
              <p className="why-card-desc">
                Log measurements inside WhatsApp in under 3 seconds. Our engine decodes natural expressions, slang, shorthand, and voice memos seamlessly.
              </p>
            </div>

            <div className="hp-why-card hover-lift">
              <div className="card-icon-wrapper bg-blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3 className="why-card-title">Enterprise Security</h3>
              <p className="why-card-desc">
                Strict multi-tenant security layers. Hospital database segregation ensures patient information remains confidential and fully isolated.
              </p>
            </div>

            <div className="hp-why-card hover-lift">
              <div className="card-icon-wrapper bg-green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3 className="why-card-title">Clinical Plausibility</h3>
              <p className="why-card-desc">
                Our Parser V2 verifies every metric against strict medical thresholds. If a value seems implausible, it triggers conversational rechecks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="hp-how">
        <div className="hp-how__container">
          <div className="section-header text-center">
            <span className="section-tag">SIMPLE THREE-STEP LOOPS</span>
            <h2 className="section-heading">How It Works</h2>
            <p className="section-subtext">
              Zero learning curve. Our background automation handles the entire pipeline in real-time.
            </p>
          </div>

          <div className="how-steps-timeline">
            <div className="how-step-row">
              <div className="how-step-text">
                <div className="step-num">01</div>
                <h3 className="step-title">Send a Quick Message</h3>
                <p className="step-description">
                  Simply send a text or audio message to our verified WhatsApp number. Say things like <em>"meraa weight 74kg hai"</em>, <em>"sugar 115 post_lunch"</em>, or send an audio note detailing your blood pressure.
                </p>
                <div className="step-accent-badge whatsapp-green">
                  🟢 Real-time Sync
                </div>
              </div>
              <div className="how-step-graphic">
                <div className="how-graphic-card">
                  <div className="card-header-bar">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                  <div className="chat-mockup">
                    <div className="msg msg-user">
                      <p>Mera blood sugar 135 post meal hai, aur kal raat weight 72 kg tha.</p>
                      <span className="msg-time">10:15 AM</span>
                    </div>
                    <div className="msg msg-bot">
                      <p>✅ Save ho gaya! <br />• Blood Sugar: 135 mg/dL (Post Meal)<br />• Weight: 72 kg<br />Is there anything else you'd like to log?</p>
                      <span className="msg-time">10:15 AM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="how-step-row reverse">
              <div className="how-step-text">
                <div className="step-num">02</div>
                <h3 className="step-title">AI Comprehension & Processing</h3>
                <p className="step-description">
                  Our clinical backend extracts physiological parameters, maps appropriate units, and normalizes meal contexts (such as pre_meal or fasting). Standalone metrics are evaluated, and duplicates are automatically filtered out.
                </p>
                <div className="step-accent-badge ai-purple">
                  ✨ Parser V2 Intelligence
                </div>
              </div>
              <div className="how-step-graphic">
                <div className="extracted-data-card">
                  <div className="extracted-title">🔍 EXTRACTED CLINICAL ENTITIES</div>
                  <div className="extracted-list">
                    <div className="extracted-item">
                      <span className="ext-label">Parameter</span>
                      <span className="ext-val val-sugar">Blood Sugar</span>
                    </div>
                    <div className="extracted-item">
                      <span className="ext-label">Value & Unit</span>
                      <span className="ext-val">135 mg/dL</span>
                    </div>
                    <div className="extracted-item">
                      <span className="ext-label">Context</span>
                      <span className="ext-val val-context">Post Meal</span>
                    </div>
                    <div className="extracted-divider" />
                    <div className="extracted-item">
                      <span className="ext-label">Parameter</span>
                      <span className="ext-val val-weight">Weight</span>
                    </div>
                    <div className="extracted-item">
                      <span className="ext-label">Value & Unit</span>
                      <span className="ext-val">72.0 kg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="how-step-row">
              <div className="how-step-text">
                <div className="step-num">03</div>
                <h3 className="step-title">Structured Trend Analysis</h3>
                <p className="step-description">
                  Logins are available for both patients and clinicians. You can instantly access trends, historical tables, charts, calendar mappings, and lab result reports structured neatly inside your secure web portal.
                </p>
                <div className="step-accent-badge portal-blue">
                  📊 Read-Only Portal Views
                </div>
              </div>
              <div className="how-step-graphic">
                <div className="trend-mini-chart-card">
                  <div className="chart-header">
                    <h4>Blood Sugar (mg/dL) — 30 Day Trend</h4>
                    <span className="chart-status status-normal">Stable</span>
                  </div>
                  <div className="chart-canvas-mock">
                    {/* SVG Line Graph */}
                    <svg viewBox="0 0 300 120" className="mini-svg-graph">
                      <defs>
                        <linearGradient id="gradient-blue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M10,90 Q40,60 80,75 T160,40 T240,55 T290,45" fill="none" stroke="#2563EB" strokeWidth="3" />
                      <path d="M10,90 Q40,60 80,75 T160,40 T240,55 T290,45 L290,110 L10,110 Z" fill="url(#gradient-blue)" />
                      <circle cx="160" cy="40" r="5" fill="#F97316" />
                      <circle cx="290" cy="45" r="5" fill="#2563EB" />
                    </svg>
                    <div className="chart-footer-labels">
                      <span>May 1</span>
                      <span>May 15</span>
                      <span>May 30</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="hp-features">
        <div className="hp-features__glow" />
        <div className="hp-features__container">
          <div className="section-header text-center">
            <span className="section-tag">UNMATCHED POWER</span>
            <h2 className="section-heading text-white">Engineered For Absolute Precision</h2>
            <p className="section-subtext text-gray">
              Under the hood, Doc2Me runs a sophisticated parser architecture built to tackle complex multi-turn clarifications, voice messages, and medical-grade validation.
            </p>
          </div>

          <div className="features-showcase-grid">
            <div className="showcase-card large-showcase bg-dark-navy">
              <div className="showcase-content">
                <span className="feature-icon bg-whatsapp">💬</span>
                <h3>WhatsApp Record Processing</h3>
                <p>
                  No application downloads. Log blood glucose, heart rate, blood pressure, oxygen saturation, temperature, weight, respiratory rate, and height naturally.
                </p>
                <ul className="feature-checklist">
                  <li>✔ Multi-observation message resolution</li>
                  <li>✔ Automatic timezone-aware logging</li>
                  <li>✔ Smart edit & correction triggers</li>
                </ul>
              </div>
              <div className="showcase-visual">
                <img
                  src="/images/features/feature-whatsapp-record.png"
                  alt="WhatsApp Chat Record experience"
                  className="showcase-img"
                />
              </div>
            </div>

            <div className="showcase-card simple-showcase">
              <span className="feature-icon bg-purple">🎙</span>
              <h3>WhatsApp Voice Intelligence</h3>
              <p>
                Send audio notes in English, Hindi, or Hinglish. Doc2Me parses, normalizes, and logs them in real-time. BP decimals (like '131.82' translated to '131/82') are processed securely inside clinical boundaries.
              </p>
            </div>

            <div className="showcase-card simple-showcase">
              <span className="feature-icon bg-amber">📄</span>
              <h3>Structured Lab OCR</h3>
              <p>
                Snap a picture of physical reports. Our Document Intelligence engine extracts parameters (HbA1c, FBS, TSH, Lipid Profile) and logs them strictly preserving original terminology.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAMILY HEALTHCARE SECTION */}
      <section id="family" className="hp-family">
        <div className="hp-family__container">
          <div className="family-split">
            <div className="family-content">
              <div className="vertical-accent-line">FAMILY PLATFORM</div>
              <span className="section-tag">LOVED ONES COHESION</span>
              <h2 className="section-heading">Keep your whole family healthy, in one chat.</h2>
              <p className="section-subtext text-left">
                Keep track of pediatric development metrics, gestational blood sugars, or aging parents' blood pressure readings. Doc2Me allows multi-profile routing under a single WhatsApp contact, giving you a synchronized space to manage family healthcare.
              </p>
              <div className="family-bullets">
                <div className="f-bullet">
                  <div className="f-bullet-icon">✓</div>
                  <div>
                    <strong>Independent Timelines:</strong> Individual health records grouped clearly under independent family profiles.
                  </div>
                </div>
                <div className="f-bullet">
                  <div className="f-bullet-icon">✓</div>
                  <div>
                    <strong>Secure Shared Access:</strong> Share historical summaries and trend charts with specialized care teams or relatives instantly.
                  </div>
                </div>
              </div>
            </div>
            <div className="family-image">
              <img
                src="/images/features/feature-family-health.png"
                alt="Family health dashboard visualization"
                className="family-large-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* DOCTORS SECTION */}
      <section id="doctors" className="hp-doctors">
        <div className="hp-doctors__container">
          <div className="section-header text-center">
            <span className="section-tag">CLINICAL STABILITY</span>
            <h2 className="section-heading">Empowering Doctors. Eliminating Typing.</h2>
            <p className="section-subtext">
              Doc2Me is a read-driven, non-diagnosing workspace. Doctors just review clean longitudinal trends instead of typing into bulky forms during consultations.
            </p>
          </div>

          <div className="doctors-split-visuals">
            <div className="doc-visual-card">
              <h4 className="doc-card-title">🩺 For Clinicians & Care Teams</h4>
              <p className="doc-card-description">
                Access a high-fidelity patient clinical workspace containing continuous logs, parsed lab values, structured progress notes, and secure record filtering.
              </p>
              <img
                src="/images/hero/hero-doctor.png"
                alt="Clinician review interface"
                className="doc-preview-img shadow-premium"
              />
            </div>

            <div className="doc-visual-card">
              <h4 className="doc-card-title">💬 During Patient Consultations</h4>
              <p className="doc-card-description">
                Dramatically reduce consultation administrative overhead. Have your patients' historic vitals organized on a neat dashboard before they step into your cabin.
              </p>
              <img
                src="/images/features/feature-doctor-consultation.png"
                alt="Doctor consultation dashboard mock"
                className="doc-preview-img shadow-premium"
              />
            </div>
          </div>
        </div>
      </section>

      {/* GLOBAL HEALTHCARE SECTION */}
      <section className="hp-global">
        <div className="hp-global__glow" />
        <div className="hp-global__container">
          <div className="global-split">
            <div className="global-image">
              <img
                src="/images/features/feature-global-health.png"
                alt="Global healthcare vision network"
                className="global-large-img"
              />
            </div>
            <div className="global-content">
              <span className="section-tag">GLOBAL VISION</span>
              <h2 className="section-heading text-white">Healthcare doesn't speak just one language.</h2>
              <p className="section-subtext text-left text-gray">
                Our parsing technology is built from the ground up to recognize and decode medical telemetry across English, Hindi, and colloquial Hinglish dialects. We break the barriers of traditional medical technology, allowing continuous health monitoring to reach anyone with a basic smartphone.
              </p>
              <div className="global-stats-row">
                <div className="g-stat">
                  <div className="g-num">3+</div>
                  <div className="g-label">Supported Dialects</div>
                </div>
                <div className="g-stat">
                  <div className="g-num">8</div>
                  <div className="g-label">Canonical Vitals</div>
                </div>
                <div className="g-stat">
                  <div className="g-num">&lt;1s</div>
                  <div className="g-label">Parsing Latency</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST, VISION & SHOWCASE SECTION */}
      <section id="trust" className="hp-showcase">
        <div className="hp-showcase__container">
          <div className="section-header text-center">
            <span className="section-tag">ENTERPRISE COMPLIANCE</span>
            <h2 className="section-heading">Designed For Absolute Trust</h2>
            <p className="section-subtext">
              We operate under medical safety frameworks, maintaining absolute isolation between patients, clinicians, and hospital organizations.
            </p>
          </div>

          <div className="showcase-visuals-grid">
            <div className="showcase-half-card">
              <span className="badge-pill">Premium Website View</span>
              <img
                src="/images/marketing/marketing-website-preview.png"
                alt="Doc2Me Platform Marketing Showcase"
                className="showcase-half-img shadow-premium"
              />
              <p className="showcase-half-caption">
                Our highly responsive, beautifully optimized interface is built to make health analysis intuitive, friendly, and empowering for consumers.
              </p>
            </div>

            <div className="showcase-half-card">
              <span className="badge-pill bg-blue-pill">Brand & Campaign Impact</span>
              <img
                src="/images/marketing/marketing-billboard.png"
                alt="Doc2Me Marketing Billboard campaign"
                className="showcase-half-img shadow-premium"
              />
              <p className="showcase-half-caption">
                Making continuous clinical tracking a global standard. Designed with empathy, security, and world-class simplicity at its heart.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="hp-pricing">
        <div className="hp-pricing__container">
          <div className="section-header text-center">
            <span className="section-tag">CLEAR & FARE</span>
            <h2 className="section-heading">Flexible Plans for Every Journey</h2>
            <p className="section-subtext">
              Start logging your vitals for free today. Upgrade anytime for advanced clinical summaries, lab OCR uploads, and family profile routing.
            </p>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-header">
                <span className="plan-name">Patient Lite</span>
                <div className="plan-price">
                  <span className="currency">$</span>
                  <span className="price-num">0</span>
                  <span className="period">/mo</span>
                </div>
                <p className="plan-desc">Perfect for tracking basic daily vitals on a single account.</p>
              </div>
              <div className="pricing-divider" />
              <ul className="pricing-features">
                <li>✔ Up to 30 WhatsApp logs / month</li>
                <li>✔ 2 Canonical physiological parameters</li>
                <li>✔ Standard 30-day dashboard trends</li>
                <li>✔ Secure login & database isolation</li>
                <li className="disabled">✕ Advanced Lab OCR scans</li>
                <li className="disabled">✕ Voice message transcriptions</li>
                <li className="disabled">✕ Shared Doctor workspace integration</li>
              </ul>
              <button className="hp-btn hp-btn--outline" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
                Get Started Free
              </button>
            </div>

            <div className="pricing-card pricing-card--featured">
              <div className="featured-badge">MOST POPULAR</div>
              <div className="pricing-header">
                <span className="plan-name">Patient Premium</span>
                <div className="plan-price">
                  <span className="currency">$</span>
                  <span className="price-num">9</span>
                  <span className="period">/mo</span>
                </div>
                <p className="plan-desc">For comprehensive, unlimited health recording and family routing.</p>
              </div>
              <div className="pricing-divider" />
              <ul className="pricing-features">
                <li>✔ Unlimited WhatsApp text & voice logs</li>
                <li>✔ Track all 8 Canonical parameters</li>
                <li>✔ Unlimited AI Health Insights & GPT summaries</li>
                <li>✔ Document OCR scans (Up to 15 reports/mo)</li>
                <li>✔ Multi-profile family routing (3 members)</li>
                <li>✔ Real-time clinical timeline exporter</li>
                <li>✔ High priority chat queue and support</li>
              </ul>
              <button className="hp-btn hp-btn--primary" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
                Start 7-Day Free Trial
              </button>
            </div>

            <div className="pricing-card">
              <div className="pricing-header">
                <span className="plan-name">Clinician / Hospital</span>
                <div className="plan-price">
                  <span className="price-num">Custom</span>
                </div>
                <p className="plan-desc">For medical practices, outpatient clinics, and large hospital networks.</p>
              </div>
              <div className="pricing-divider" />
              <ul className="pricing-features">
                <li>✔ Unlimited assigned patient profiles</li>
                <li>✔ Specialized Clinical Workspace overlays</li>
                <li>✔ Secure multi-tenant hospital partitioning</li>
                <li>✔ Automated patient compliance reports</li>
                <li>✔ Custom SMS / WhatsApp campaign outreach</li>
                <li>✔ API integration into existing EMR/EHR</li>
                <li>✔ Dedicated account manager & SLA support</li>
              </ul>
              <button className="hp-btn hp-btn--outline" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="hp-faq">
        <div className="hp-faq__container">
          <div className="section-header text-center">
            <span className="section-tag">COMMON QUESTIONS</span>
            <h2 className="section-heading">Frequently Asked Questions</h2>
            <p className="section-subtext">
              Everything you need to know about our parsing capabilities, security models, and clinical boundaries.
            </p>
          </div>

          <div className="faq-accordion">
            {faqData.map((item, index) => {
              const isOpen = activeFAQ === index;
              return (
                <div
                  key={index}
                  className={`faq-item ${isOpen ? "faq-item--open" : ""}`}
                >
                  <button
                    className="faq-question"
                    onClick={() => setActiveFAQ(isOpen ? null : index)}
                  >
                    <span>{item.q}</span>
                    <span className="faq-chevron">{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && (
                    <div className="faq-answer">
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="hp-final-cta">
        <div className="hp-final-cta__bg" />
        <div className="hp-final-cta__container">
          <h2 className="cta-heading">Ready to transform your healthcare records?</h2>
          <p className="cta-subheading">
            Join thousands of patients and leading clinicians who are already experiencing continuous, typing-free longitudinal history. Send your first WhatsApp vital in under 30 seconds.
          </p>
          <div className="cta-actions">
            <button className="hp-btn hp-btn--lg hp-btn--primary bg-white text-navy" onClick={onLoginClick || (() => window.location.href = "/?view=login")}>
              Create Your Free Account
            </button>
            <button className="hp-btn hp-btn--lg hp-btn--outline text-white border-white" onClick={() => handleScrollTo("how-it-works")}>
              Learn the Science
            </button>
          </div>
        </div>
      </section>

      {/* LARGE PREMIUM FOOTER */}
      <footer className="hp-footer">
        <div className="hp-footer__container">
          <div className="hp-footer__main">
            <div className="footer-brand-column">
              <img src="/images/branding/logo-horizontal.png" alt="Doc2Me Brand horizontal Logo" className="footer-logo" />
              <p className="footer-tagline">
                AI-powered WhatsApp Health Record Platform
              </p>
              <div className="footer-socials">
                <a href="#twitter" aria-label="Twitter" className="social-icon">𝕏</a>
                <a href="#linkedin" aria-label="LinkedIn" className="social-icon">in</a>
                <a href="#github" aria-label="GitHub" className="social-icon">git</a>
                <a href="#youtube" aria-label="YouTube" className="social-icon">yt</a>
              </div>
            </div>

            <div className="footer-links-grid">
              <div className="footer-column">
                <h4 className="footer-col-title">Platform</h4>
                <button onClick={() => handleScrollTo("why-us")} className="footer-link-btn">Why Doc2Me</button>
                <button onClick={() => handleScrollTo("how-it-works")} className="footer-link-btn">How It Works</button>
                <button onClick={() => handleScrollTo("features")} className="footer-link-btn">Features</button>
                <button onClick={() => handleScrollTo("pricing")} className="footer-link-btn">Pricing</button>
              </div>

              <div className="footer-column">
                <h4 className="footer-col-title">Use Cases</h4>
                <button onClick={() => handleScrollTo("family")} className="footer-link-btn">For Family Care</button>
                <button onClick={() => handleScrollTo("doctors")} className="footer-link-btn">For Clinicians</button>
                <a href="#hospitals" className="footer-link">For Hospital Networks</a>
                <a href="#diabetes" className="footer-link">Diabetes Tracking</a>
              </div>

              <div className="footer-column">
                <h4 className="footer-col-title">Resources</h4>
                <button onClick={() => handleScrollTo("faq")} className="footer-link-btn">FAQ Helpdesk</button>
                <a href="#clinical-safety" className="footer-link">Clinical Boundaries</a>
                <a href="#security" className="footer-link">Privacy Standards</a>
                <a href="#contact" className="footer-link">Developer API</a>
              </div>

              <div className="footer-column">
                <h4 className="footer-col-title">Join Our Newsletter</h4>
                <p className="newsletter-text">Stay updated on continuous clinical telemetry advancements.</p>
                <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="newsletter-input"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                  <button type="submit" className="newsletter-submit-btn">→</button>
                </form>
                {submittedEmail && (
                  <span className="newsletter-success-msg">✔ Subscribed successfully!</span>
                )}
              </div>
            </div>
          </div>

          <div className="hp-footer__disclaimer">
            <p>
              <strong>Clinical Telemetry Organizer Disclaimer:</strong> Doc2Me is a secure metadata tracking and health information organizer. It operates as a read-driven, continuous ledger of manual logs, voice inputs, and optical characters parsed from laboratory documentation. Doc2Me does NOT issue diagnoses, recommend therapeutic interventions, formulate active prescription guidance, or act as an autonomous clinical decision provider. All calculated telemetry, stats, and AI summary insights should be audited directly by licensed medical practitioners during active consultations.
            </p>
          </div>

          <div className="hp-footer__bottom">
            <p className="copyright-text">
              &copy; {new Date().getFullYear()} Doc2Me Platform. All rights reserved. Built for typing-free clinical workspaces, high patient compliance, and chronological clarity.
            </p>
            <div className="footer-legal-links">
              <a href="#privacy" className="footer-legal-link">Privacy Policy</a>
              <span className="dot-divider">•</span>
              <a href="#terms" className="footer-legal-link">Terms of Service</a>
              <span className="dot-divider">•</span>
              <a href="#contact" className="footer-legal-link">Contact Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomepageV1;
