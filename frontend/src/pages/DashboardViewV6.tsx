import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import { type PatientOption } from "../components/PatientSelector";
import { type PatientSummaryMap } from "../services/patientService";
import { type TimelineRecord } from "../components/TimelineItem";
import { type TimelineFilterValue } from "../components/TimelineFilter";
import { type ParameterStats } from "../utils/stats";
import { type HealthParameter } from "../hooks/useTrendData";
import { type TabType } from "./Dashboard";
import { formatRecordDateTime, formatGlucoseContext, getLocalDateString } from "../utils/date";

import "./DashboardV6.css";

const EditorialTransition: React.FC<{ text: string; kicker?: string }> = ({ text, kicker }) => {
  return (
    <div className="v6-editorial-divider-section fade-in">
      <div className="v6-editorial-line"></div>
      <div className="v6-editorial-content">
        {kicker && <span className="v6-editorial-kicker">{kicker}</span>}
        <p className="v6-editorial-quote-text">
          {text}
        </p>
      </div>
      <div className="v6-editorial-line"></div>
    </div>
  );
};

interface DashboardViewV6Props {
  user: User;
  effectivePatientId: string;
  selectedPatientOption?: PatientOption;
  summary: PatientSummaryMap | null;
  timeline: TimelineRecord[];
  timelineFilter: TimelineFilterValue;
  setTimelineFilter: (val: TimelineFilterValue) => void;
  isTimelineLoading: boolean;
  isPatientsLoading: boolean;
  hasSummaryError: boolean;
  hasTimelineError: boolean;
  bloodSugarStats: ParameterStats;
  bloodPressureStats: ParameterStats;
  heartRateStats: ParameterStats;
  temperatureStats: ParameterStats;
  weightStats: ParameterStats;
  selectedParameter: HealthParameter;
  setSelectedParameter: (param: HealthParameter) => void;
  visibleTimeline: TimelineRecord[];
  setIsModalOpen: (open: boolean) => void;
  onTabChange?: (tab: TabType) => void;
  setSelectedHistoryDate?: (dateStr: string | null) => void;
}

const DashboardViewV6: React.FC<DashboardViewV6Props> = ({
  user,
  effectivePatientId,
  selectedPatientOption: _selectedPatientOption,
  summary,
  timeline,
  timelineFilter: _timelineFilter,
  setTimelineFilter: _setTimelineFilter,
  isTimelineLoading: _isTimelineLoading,
  isPatientsLoading: _isPatientsLoading,
  hasSummaryError: _hasSummaryError,
  hasTimelineError: _hasTimelineError,
  bloodSugarStats: _bloodSugarStats,
  bloodPressureStats: _bloodPressureStats,
  heartRateStats: _heartRateStats,
  temperatureStats: _temperatureStats,
  weightStats: _weightStats,
  selectedParameter: _selectedParameter,
  setSelectedParameter: _setSelectedParameter,
  visibleTimeline: _visibleTimeline,
  setIsModalOpen,
  onTabChange,
  setSelectedHistoryDate,
}) => {
  const [labObservations, setLabObservations] = useState<any[]>([]);
  const [isLabsLoading, setIsLabsLoading] = useState(false);
  const [hasLabsError, setHasLabsError] = useState(false);
  const [summaryMode, setSummaryMode] = useState<"summary" | "report">("report");
  const [selectedDrilldownBlock, setSelectedDrilldownBlock] = useState<any | null>(null);

  useEffect(() => {
    if (effectivePatientId) {
      setIsLabsLoading(true);
      setHasLabsError(false);
      api.get(`/patient/lab-observations/${effectivePatientId}`)
        .then(res => {
          if (res.data.success) {
            setLabObservations(res.data.observations || []);
          } else {
            setHasLabsError(true);
          }
        })
        .catch(err => {
          console.error("Error fetching lab observations in DashboardViewV6:", err);
          setHasLabsError(true);
        })
        .finally(() => {
          setIsLabsLoading(false);
        });
    }
  }, [effectivePatientId]);

  // Factual Health Summary calculation for Last 30 Days
  const factualSummaryBlocks = React.useMemo(() => {
    const parameters = [
      { key: "blood_sugar", label: "Blood Sugar", unit: "mg/dL" },
      { key: "blood_pressure", label: "Blood Pressure", unit: "mmHg" },
      { key: "heart_rate", label: "Heart Rate", unit: "bpm" },
      { key: "body_temperature", label: "Temperature", unit: "°C" },
      { key: "weight", label: "Weight", unit: "kg" }
    ];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return parameters.map((p) => {
      const records = timeline.filter(
        (r) => r.parameter === p.key && r.recordedAt && new Date(r.recordedAt).getTime() >= thirtyDaysAgo.getTime()
      );

      if (records.length === 0) {
        return {
          key: p.key,
          label: p.label,
          hasData: false,
          text: `No ${p.label.toLowerCase()} readings recorded in the last 30 days.`,
          metrics: null
        };
      }

      if (p.key === "blood_pressure") {
        const bpRecords = records.map(r => {
          const parts = String(r.value).split("/");
          return parts.length === 2 ? { sys: Number(parts[0]), dia: Number(parts[1]) } : null;
        }).filter((r): r is { sys: number; dia: number } => r !== null && !isNaN(r.sys) && !isNaN(r.dia));

        if (bpRecords.length === 0) {
          return {
            key: p.key,
            label: p.label,
            hasData: false,
            text: `No valid BP readings in the last 30 days.`,
            metrics: null
          };
        }

        const sysVals = bpRecords.map(r => r.sys);
        const diaVals = bpRecords.map(r => r.dia);

        const latestVal = records[0].value;
        const minSys = Math.min(...sysVals);
        const maxSys = Math.max(...sysVals);
        const minDia = Math.min(...diaVals);
        const maxDia = Math.max(...diaVals);
        const avgSys = Math.round(sysVals.reduce((s, v) => s + v, 0) / sysVals.length);
        const avgDia = Math.round(diaVals.reduce((s, v) => s + v, 0) / diaVals.length);

        return {
          key: p.key,
          label: p.label,
          hasData: true,
          text: `Last 30 Days: ${records.length} BP readings. Average: ${avgSys}/${avgDia} mmHg. Range: ${minSys}/${minDia} to ${maxSys}/${maxDia} mmHg. Latest: ${latestVal} mmHg.`,
          metrics: {
            latest: `${latestVal}`,
            average: `${avgSys}/${avgDia}`,
            range: `${minSys}/${minDia} – ${maxSys}/${maxDia}`,
            count: records.length
          }
        };
      }

      const numericValues = records.map(r => Number(r.value)).filter(v => !isNaN(v));
      if (numericValues.length === 0) {
        return {
          key: p.key,
          label: p.label,
          hasData: false,
          text: `No numeric ${p.label.toLowerCase()} readings recorded in the last 30 days.`,
          metrics: null
        };
      }

      const latestVal = records[0].value;
      const minVal = Math.min(...numericValues);
      const maxVal = Math.max(...numericValues);
      const avgVal = (numericValues.reduce((s, v) => s + v, 0) / numericValues.length).toFixed(1);

      return {
        key: p.key,
        label: p.label,
        hasData: true,
        text: `Last 30 Days: ${records.length} ${p.label.toLowerCase()} readings. Average: ${avgVal} ${p.unit}. Range: ${minVal}–${maxVal} ${p.unit}. Latest: ${latestVal} ${p.unit}.`,
        metrics: {
          latest: `${latestVal} ${p.unit}`,
          average: `${avgVal} ${p.unit}`,
          range: `${minVal} – ${maxVal} ${p.unit}`,
          count: records.length
        }
      };
    });
  }, [timeline]);

  const hasAnyFactualSummaryData = React.useMemo(() => {
    return factualSummaryBlocks.some(block => block.hasData);
  }, [factualSummaryBlocks]);

  const getLatestRecord = (key: string) => {
    if (!summary) return null;
    const record = (summary as Record<string, { value?: string | number; unit?: string; context?: string; timeContext?: string; recordedAt?: string } | undefined>)[key];
    if (!record || record.value === undefined || record.value === null) return null;
    return record;
  };

  const todayRecords = timeline
    .filter(r => r.recordedAt && getLocalDateString(r.recordedAt) === getLocalDateString(new Date()))
    .sort((a, b) => {
      const tA = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
      const tB = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
      if (tA !== tB) {
        return tB - tA;
      }
      const order = { morning: 1, afternoon: 2, evening: 3, night: 4 };
      const valA = order[(a.timeContext || "") as keyof typeof order] || 0;
      const valB = order[(b.timeContext || "") as keyof typeof order] || 0;
      return valB - valA;
    });

  const formatTodayDateHeader = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  };

  const formatTimeOnly = (recordedAt?: string) => {
    if (!recordedAt) return "—";
    const date = new Date(recordedAt);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  };

  return (
    <div className="v6-page-canvas">

      {/* SECTION 1: HERO LANDING FIELD (EDGE-TO-EDGE & ALIVE) */}
      <section className="v6-hero-section">
        {/* Floating Decorative Elements integrated natively */}
        <img src="/images/backgrounds/bg-floating-paper-planes.png" alt="" className="v6-floating-asset planes" aria-hidden="true" />
        <img src="/images/backgrounds/bg-floating-medical-elements.png" alt="" className="v6-floating-asset medical" aria-hidden="true" />

        <div className="v6-hero-top-badge-row">
          <div className="v6-brand-tag">
            <img src="/images/branding/logo-primary.png" alt="Doc2Me Brand Badge" className="v6-brand-icon" />
            <span className="v6-brand-text">Doc2Me SaaS Intelligence</span>
          </div>
          <span className="v6-hero-kicker-pill">✨ Evolving Health Informatics</span>
        </div>

        <div className="v6-hero-main-layout">
          <div className="v6-hero-text-block">
            <h1 className="v6-hero-main-title">
              Your Vitals, Decoded.<br />
              <span className="v6-gradient-text">WhatsApp to AI Record.</span>
            </h1>
            <p className="v6-hero-lead-paragraph">
              Welcome back, <strong>{user.fullName || user.username}</strong>. Experience Doc2Me—the premium, human-centric clinical landing paradigm that auto-structures conversations, voice logs, and laboratory specimens into a beautiful digital timeline.
            </p>

            <div className="v6-hero-ctas">
              <button className="v6-primary-glow-btn" onClick={() => setIsModalOpen(true)}>
                + Submit New Observation
              </button>
              {onTabChange && (
                <button className="v6-secondary-outline-btn" onClick={() => onTabChange("trends")}>
                  Explore Dashboard Timeline
                </button>
              )}
            </div>

            <div className="v6-active-meta-card">
              <div className="v6-meta-item">
                <span className="v6-meta-label">Patient Space ID</span>
                <span className="v6-meta-value">{user.patientId || user.username}</span>
              </div>
              <div className="v6-meta-divider"></div>
              <div className="v6-meta-item">
                <span className="v6-meta-label">Clinical Status</span>
                <span className="v6-meta-value active">Connected • Sync Active</span>
              </div>
            </div>
          </div>

          <div className="v6-hero-centerpiece-container">
            <div className="v6-centerpiece-frame-wrapper">
              <div className="v6-centerpiece-glass-header">
                <img src="/images/branding/logo-horizontal.png" alt="Doc2Me Horizontal Logo" className="v6-header-logo-asset" />
                <span className="v6-live-indicator">LIVE PREVIEW V6</span>
              </div>
              <img src="/images/hero/hero-main-platform.png" alt="Doc2Me SaaS Core Platform Mockup" className="v6-hero-main-screenshot" />
            </div>
          </div>
        </div>
      </section>

      <EditorialTransition kicker="The Core Philosophy" text="“Minimum input, maximum intelligence. We translate routine natural updates into clinical structure without typing overhead.”" />

      {/* SECTION 2: THE CONVERSATIONAL WHATSAPP PIPELINE (STORY-DRIVEN) */}
      <section className="v6-section-panel v6-whatsapp-panel">
        <div className="v6-panel-grid">
          <div className="v6-panel-info-column">
            <span className="v6-section-tag orange">Conversational Layer</span>
            <h2 className="v6-section-headline">
              Natural Language Stream.<br />
              Zero Forms Required.
            </h2>
            <p className="v6-section-description">
              Our advanced Medical Entity Engine parses multi-observation inputs in English, Hindi, and Hinglish. It isolates raw clinical segments, preserves exact temperature units, and validates numerical boundaries seamlessly.
            </p>

            <div className="v6-highlights-list">
              <div className="v6-highlight-item">
                <span className="v6-icon-bullet">💬</span>
                <div>
                  <strong>Preserves Natural Timing:</strong> Synonyms like "empty stomach", "dopahar", or "kal raat" are mapped accurately to the India calendar timeline.
                </div>
              </div>
              <div className="v6-highlight-item">
                <span className="v6-icon-bullet">🎙️</span>
                <div>
                  <strong>Voice Intelligence:</strong> Translates spoken audio and voice transcripts with built-in segment filtering for extreme conversational reliability.
                </div>
              </div>
            </div>
          </div>

          <div className="v6-panel-visual-column">
            {/* Overlay Stack of Smartphone mockup and WhatsApp pipeline asset */}
            <div className="v6-layered-graphics-container">
              <div className="v6-graphics-card-base">
                <img src="/images/features/feature-whatsapp-record.png" alt="Doc2Me WhatsApp Integration Scheme" className="v6-base-story-artwork" />
              </div>

              {/* Floating high-fidelity WhatsApp mockup */}
              <div className="v6-smartphone-floating-overlay">
                <div className="v6-smartphone-header">
                  <div className="v6-whatsapp-indicator-avatar">💬</div>
                  <div>
                    <div className="v6-whatsapp-title">Doc2Me Assistant</div>
                    <div className="v6-whatsapp-subtitle">Online • Medical Engine</div>
                  </div>
                </div>
                <div className="v6-smartphone-messages">
                  <div className="v6-msg user">
                    Mera fasting sugar 112 hai aur kal raat ko BP 120/82 tha.
                  </div>
                  <div className="v6-msg system">
                    <span className="system-tag">Doc2Me AI</span>
                    Fasting Blood Sugar of <strong>112 mg/dL</strong> and Blood Pressure of <strong>120/82 mmHg</strong> logged securely! 🩺🩸
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <EditorialTransition kicker="Chronological Evidence" text="“A healthy life is built on continuous signals. Doc2Me gathers and compiles those signals into a beautiful chronological diary.”" />

      {/* SECTION 3: LATEST HEALTH SNAPSHOT (ALIVE CARD MATRIX) */}
      <section className="v6-section-panel v6-snapshot-panel">
        <div className="v6-section-header-centered">
          <span className="v6-section-tag blue">Realtime Vitals</span>
          <h2 className="v6-section-headline centered">Latest Health Snapshot</h2>
          <p className="v6-section-lead-centered">
            Highly specialized physiological measurements tracked from your most recent conversational logs. Click any card to explore historic timelines.
          </p>
        </div>

        <div className="v6-snapshot-grid">
          {[
            { key: "blood_sugar", label: "Blood Sugar", icon: "🩸", fallbackUnit: "mg/dL", bgGradient: "linear-gradient(135deg, #FFFBF2 0%, #FFF3E6 100%)", borderCol: "#FF7A00", tagBg: "rgba(255,122,0,0.12)", color: "#FF7A00" },
            { key: "blood_pressure", label: "Blood Pressure", icon: "🩺", fallbackUnit: "mmHg", bgGradient: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)", borderCol: "#0EA5E9", tagBg: "rgba(14,165,233,0.12)", color: "#0EA5E9" },
            { key: "heart_rate", label: "Heart Rate", icon: "❤️", fallbackUnit: "bpm", bgGradient: "linear-gradient(135deg, #FFF5F5 0%, #FFE4E6 100%)", borderCol: "#F43F5E", tagBg: "rgba(244,63,94,0.12)", color: "#F43F5E" },
            { key: "body_temperature", label: "Temperature", icon: "🌡️", fallbackUnit: "°C", bgGradient: "linear-gradient(135deg, #FFFDF0 0%, #FEF9C3 100%)", borderCol: "#EAB308", tagBg: "rgba(234,179,8,0.12)", color: "#EAB308" },
            { key: "weight", label: "Weight", icon: "⚖️", fallbackUnit: "kg", bgGradient: "linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)", borderCol: "#7C3AED", tagBg: "rgba(124,58,237,0.12)", color: "#7C3AED" }
          ].map((param) => {
            const record = getLatestRecord(param.key);

            return (
              <div
                key={param.key}
                className="v6-metric-snapshot-card"
                style={{ background: param.bgGradient, borderTop: `4px solid ${param.borderCol}` }}
                onClick={() => onTabChange && onTabChange("trends")}
              >
                <div className="v6-metric-header">
                  <span className="v6-metric-label">{param.label}</span>
                  <div className="v6-metric-icon-sphere" style={{ background: param.tagBg, color: param.color }}>
                    {param.icon}
                  </div>
                </div>

                <div className="v6-metric-main-value">
                  {record ? (
                    <div className="v6-value-wrapper">
                      <div className="v6-value-digits-row">
                        <span className="v6-digits">{record.value}</span>
                        <span className="v6-unit">{record.unit || param.fallbackUnit}</span>
                      </div>

                      {param.key === "blood_sugar" && record.context && formatGlucoseContext(record.context) && (
                        <span className="v6-sugar-context-tag">
                          {formatGlucoseContext(record.context)}
                        </span>
                      )}

                      <div className="v6-recorded-time-indicator">
                        {record.timeContext ? (
                          `${record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1)} · ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(record.recordedAt!))}`
                        ) : (
                          formatRecordDateTime(record.recordedAt)
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="v6-empty-metric-text">No active data streams</span>
                  )}
                </div>

                <div className="v6-metric-card-actions">
                  <button
                    className="v6-metric-view-btn"
                    style={{ background: param.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onTabChange) onTabChange("trends");
                    }}
                  >
                    View Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: TODAY'S HEALTH & TIMELINE ACTIVITY */}
      <section className="v6-section-panel v6-today-panel">
        <div className="v6-today-layout-grid">
          <div className="v6-today-logs-column">
            <div className="v6-today-top-header">
              <div>
                <span className="v6-section-tag green">Activity Feed</span>
                <h2 className="v6-section-headline" style={{ margin: "4px 0 8px 0" }}>Registered Today</h2>
                <p className="v6-section-sub">
                  {formatTodayDateHeader(new Date())} · {todayRecords.length} observation{todayRecords.length !== 1 ? "s" : ""} recorded
                </p>
              </div>

              <button className="v6-pulsing-action-btn" onClick={() => setIsModalOpen(true)}>
                + Add Manual Vitals
              </button>
            </div>

            {todayRecords.length === 0 ? (
              <div className="v6-today-blank-container">
                <div className="v6-blank-logo">🕒</div>
                <p className="v6-blank-text">
                  No readings recorded yet today. Text or speak on WhatsApp to register observations instantly!
                </p>
              </div>
            ) : (
              <div className="v6-today-logs-scrollbox">
                {todayRecords.map((record, index) => {
                  const displayParam = record.parameter.replace("_", " ").toUpperCase().replace(/\b\w/g, c => c.toUpperCase());
                  const timeStr = formatTimeOnly(record.recordedAt);

                  return (
                    <div
                      key={index}
                      className="v6-today-item-strip"
                      onClick={() => {
                        if (setSelectedHistoryDate) {
                          setSelectedHistoryDate(getLocalDateString(record.recordedAt));
                        }
                        if (onTabChange) onTabChange("trends");
                      }}
                    >
                      <div className="v6-strip-left">
                        <span className="v6-time-stamp-badge">
                          {record.timeContext ? record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1) : timeStr}
                        </span>
                        <strong className="v6-strip-title">{displayParam}</strong>
                      </div>
                      <div className="v6-strip-right">
                        <span className="v6-strip-numeric">
                          {record.value} <span className="v6-strip-unit">{record.unit}</span>
                          {record.parameter === "blood_sugar" && record.context && formatGlucoseContext(record.context) && (
                            <span className="v6-strip-context-tag">
                              {formatGlucoseContext(record.context)}
                            </span>
                          )}
                        </span>
                        <span className="v6-strip-arrow">→</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="v6-today-storytelling-column">
            <div className="v6-showcase-story-card">
              <span className="v6-image-badge green">Clinical Timeline Story</span>
              <img src="/images/hero/hero-health-story.png" alt="Clinical Vitals Chronology Representation" className="v6-story-artwork-large" />
              <div className="v6-artwork-caption">
                <strong>Structured Chronology:</strong> Doc2Me formats various entries chronologically. Your care team tracks exact progressions without manual translation.
              </div>
            </div>
          </div>
        </div>
      </section>

      <EditorialTransition kicker="Clinician Integration" text="“Care is collaborative. Doc2Me closes the loop between patient lifestyle and medical decision making.”" />

      {/* SECTION 5: CLINICAL WORKSPACE & SPECIMEN REPORTS (LAB RESULTS) */}
      <section className="v6-section-panel v6-labs-workspace-panel">
        <div className="v6-labs-workspace-grid">
          <div className="v6-doctor-workspace-column">
            <div className="v6-showcase-story-card">
              <span className="v6-image-badge blue">Clinician Analytics Console</span>
              <img src="/images/hero/hero-doctor.png" alt="Medical Practitioner Reviewing Vitals" className="v6-story-artwork-large" />
              <div className="v6-artwork-caption">
                <strong>Read-Driven EHR Integration:</strong> Clinicians review beautiful, self-populating digital timelines before patient sessions, saving up to 15 minutes of dictation.
              </div>
            </div>
          </div>

          <div className="v6-laboratory-column">
            <div className="v6-lab-header-flex">
              <div>
                <span className="v6-section-tag purple">Laboratory Records</span>
                <h2 className="v6-section-headline" style={{ margin: "4px 0 8px 0" }}>Laboratory Results</h2>
                <p className="v6-section-sub">
                  Fully structured pathological readings parsed from document scans uploaded via WhatsApp.
                </p>
              </div>

              {onTabChange && (
                <button className="v6-lab-explore-btn" onClick={() => onTabChange("trends")}>
                  Explore history →
                </button>
              )}
            </div>

            <div className="v6-labs-results-list">
              {isLabsLoading ? (
                <div className="v6-lab-loading-placeholder">Loading lab findings...</div>
              ) : hasLabsError ? (
                <div className="v6-lab-error-placeholder">Failed to retrieve laboratory records.</div>
              ) : labObservations.length === 0 ? (
                <div className="v6-lab-empty-placeholder">
                  <strong>No laboratory records found</strong>
                  <span>Once you upload lab reports via WhatsApp, structured observations will appear here securely.</span>
                </div>
              ) : (
                <div className="v6-lab-stack">
                  {labObservations.slice(0, 3).map((obs, idx) => {
                    const isAbnormal = obs.flag && (obs.flag.toLowerCase() === "high" || obs.flag.toLowerCase() === "low");

                    return (
                      <div key={idx} className="v6-lab-item-row" style={{ borderLeft: `5px solid #7C3AED` }}>
                        <div className="v6-lab-item-details">
                          <div className="v6-lab-meta-row">
                            <span className="v6-specimen-badge">Specimen</span>
                            <span className="v6-specimen-date">
                              {new Date(obs.specimenDate || obs.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <strong className="v6-lab-test-title">{obs.testName}</strong>
                        </div>

                        <div className="v6-lab-item-metric-flag">
                          <strong className="v6-lab-value">
                            {obs.value} <span className="v6-lab-unit">{obs.unit}</span>
                          </strong>
                          {obs.flag && (
                            <span className={`v6-lab-flag-pill ${isAbnormal ? "high" : "normal"}`}>
                              {obs.flag}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <EditorialTransition kicker="Longitudinal Insights" text="“Data is only as valuable as the wisdom we extract from it. We avoid diagnostic fabrication, focusing entirely on objective truth.”" />

      {/* SECTION 6: YOUR HEALTH AT A GLANCE (30-DAY ANALYTICAL SUMMARY) */}
      <section className="v6-section-panel v6-glance-panel">
        <div className="v6-summary-top-row">
          <div>
            <span className="v6-section-tag orange">Trend Briefing</span>
            <h2 className="v6-section-headline" style={{ margin: "4px 0 8px 0" }}>Your Health at a Glance</h2>
            <p className="v6-section-sub">
              Longitudinal analysis calculated across the previous 30 days of conversational vital logs.
            </p>
          </div>

          <div className="v6-summary-toggle-pill">
            <button
              className={`v6-summary-toggle-item ${summaryMode === "summary" ? "active" : ""}`}
              onClick={() => setSummaryMode("summary")}
            >
              Summary Text
            </button>
            <button
              className={`v6-summary-toggle-item ${summaryMode === "report" ? "active" : ""}`}
              onClick={() => setSummaryMode("report")}
            >
              Structured Report
            </button>
          </div>
        </div>

        {(() => {
          const paramStyles: Record<string, { border: string; text: string; bg: string }> = {
            blood_sugar: { border: "#FF7A00", text: "#FF7A00", bg: "#FFFBF7" },
            blood_pressure: { border: "#0EA5E9", text: "#0EA5E9", bg: "#F0F9FF" },
            heart_rate: { border: "#F43F5E", text: "#F43F5E", bg: "#FFF5F5" },
            body_temperature: { border: "#EAB308", text: "#EAB308", bg: "#FFFDF0" },
            weight: { border: "#7C3AED", text: "#7C3AED", bg: "#FAF5FF" }
          };

          return summaryMode === "summary" ? (
            <div className="v6-summary-narratives-stack">
              {hasAnyFactualSummaryData ? (
                factualSummaryBlocks.map((block) => {
                  const config = paramStyles[block.key] || { border: "#cbd5e1", text: "#0F172A", bg: "#ffffff" };

                  return (
                    <div
                      key={block.key}
                      className="v6-narrative-block-card"
                      style={{ borderLeft: `5px solid ${config.border}`, background: config.bg }}
                    >
                      <strong className="v6-narrative-label" style={{ color: config.text }}>
                        {block.label}
                      </strong>
                      <p className="v6-narrative-paragraph" style={{ fontStyle: block.hasData ? "normal" : "italic" }}>
                        {block.text}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="v6-narrative-block-card empty">
                  <span style={{ fontStyle: "italic", opacity: 0.6 }}>No parameters logged in the last 30 days.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="v6-summary-structured-grid">
              {factualSummaryBlocks.map((block) => {
                const isClickable = block.hasData;
                const config = paramStyles[block.key] || { border: "#cbd5e1", text: "#0F172A", bg: "#ffffff" };

                return (
                  <div
                    key={block.key}
                    onClick={() => isClickable && setSelectedDrilldownBlock(block)}
                    className={`v6-structured-item-card ${isClickable ? "clickable" : ""}`}
                    style={{ background: config.bg, borderLeft: `5px solid ${config.border}` }}
                  >
                    <div className="v6-structured-card-top">
                      <strong className="v6-structured-title" style={{ color: config.text }}>{block.label}</strong>
                      {isClickable && (
                        <div className="v6-structured-explore-link" style={{ color: config.text }}>
                          <span>Explore</span>
                          <span>→</span>
                        </div>
                      )}
                    </div>

                    {block.hasData && block.metrics ? (
                      <div className="v6-structured-table">
                        <div className="v6-table-row">
                          <span className="v6-row-lbl">Latest Reading:</span>
                          <strong className="v6-row-val">{block.metrics.latest}</strong>
                        </div>
                        <div className="v6-table-row">
                          <span className="v6-row-lbl">Average (30D):</span>
                          <strong className="v6-row-val">{block.metrics.average}</strong>
                        </div>
                        <div className="v6-table-row">
                          <span className="v6-row-lbl">Log Count:</span>
                          <strong className="v6-row-val">{block.metrics.count} entries</strong>
                        </div>
                      </div>
                    ) : (
                      <span className="v6-structured-empty">No active logs registered</span>
                    )}

                    <div className="v6-structured-card-footer">
                      <button
                        className="v6-structured-drill-btn"
                        style={{ background: config.border }}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isClickable) {
                            setSelectedDrilldownBlock(block);
                          }
                        }}
                      >
                        Explore Trend Records
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="v6-disclaimer-panel">
          ⚠️ <strong>Clinical Disclaimer:</strong> Automatically computed strictly from patient-reported measurements. This is for reference only and does not constitute formal medical diagnosis, advice, or treatment changes.
        </div>
      </section>

      {/* SECTION 7: MODERN FEATURE HIGHLIGHT GRID */}
      <section className="v6-features-highlights-section">
        <div className="v6-section-header-centered">
          <span className="v6-section-tag green">Doc2Me Ecosystem</span>
          <h2 className="v6-section-headline centered">Premium Features Designed for Growth</h2>
          <p className="v6-section-lead-centered">
            Doc2Me brings advanced, secure, and resilient clinical SaaS utilities to patients, physicians, and health operators.
          </p>
        </div>

        <div className="v6-highlights-grid">
          <div className="v6-highlight-feature-card">
            <div className="v6-highlight-artwork-box">
              <img src="/images/features/feature-global-health.png" alt="Global scale connectivity" className="v6-feature-card-image" />
            </div>
            <h3>Enterprise Global Standards</h3>
            <p>Multi-tenant isolated databases, strict PHI protection, and automatic high-availability compliance layers.</p>
          </div>

          <div className="v6-highlight-feature-card">
            <div className="v6-highlight-artwork-box">
              <img src="/images/features/feature-family-health.png" alt="Family health telemetry" className="v6-feature-card-image" />
            </div>
            <h3>Integrated Family History</h3>
            <p>Seamlessly track and separate parameters for multiple family members under unified accounts with full context resolution.</p>
          </div>

          <div className="v6-highlight-feature-card">
            <div className="v6-highlight-artwork-box">
              <img src="/images/features/feature-doctor-consultation.png" alt="Direct medical collaboration" className="v6-feature-card-image" />
            </div>
            <h3>Direct Physician Consultation</h3>
            <p>No more dictation delays. Vitals and lab measurements flow directly into active consulting windows for zero-friction care.</p>
          </div>
        </div>
      </section>

      {/* SECTION 8: AI HEALTH INSIGHTS BRIEFINGS & CLINICAL PREVIEWS */}
      <section className="v6-section-panel v6-insights-briefing-panel">
        <div className="v6-insights-flex-grid">
          <div className="v6-insights-artwork-side">
            <div className="v6-premium-stacked-artwork">
              <img src="/images/marketing/marketing-website-preview.png" alt="Doc2Me Marketing Site Preview" className="v6-preview-artwork main" />
              <div className="v6-artwork-insight-pill">✦ Grounded Medical AI</div>
            </div>
          </div>

          <div className="v6-insights-content-side">
            <span className="v6-section-tag purple">Informatics Engine</span>
            <h2 className="v6-section-headline">
              AI Health Insights Hub & Analytics Dashboard
            </h2>
            <p className="v6-section-description">
              Receive highly personalized, supportive narrative summaries mapping out your metrics. Grounded strictly in factual logs, our parser avoids diagnostic fabrication and stays 100% compliant with standard clinical boundaries.
            </p>

            {onTabChange && (
              <div className="v6-insights-action-block">
                <button className="v6-gradient-purple-btn" onClick={() => onTabChange("ai-insights")}>
                  Open Insights Hub ✦
                </button>
                <button className="v6-text-explore-link" onClick={() => onTabChange("trends")}>
                  Learn more about active indicators
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 9: REAL WORLD OUT-OF-HOME PLACEMENT (MASSIVE PREMIUM PRESENCE) */}
      <section className="v6-billboard-showcase-section">
        <div className="v6-section-header-centered">
          <span className="v6-section-tag yellow">Doc2Me Brand Scale</span>
          <h2 className="v6-section-headline centered">Digital Trust, Realized</h2>
          <p className="v6-section-lead-centered">
            Doc2Me is more than software—it's a patient-first ecosystem trusted across clinics, communities, and real-world placements.
          </p>
        </div>

        <div className="v6-billboard-full-viewport">
          <div className="v6-billboard-wrapper-shadow">
            <img src="/images/marketing/marketing-billboard.png" alt="Doc2Me Real World Outdoor Billboard Placement" className="v6-massive-billboard-image" />
            <div className="v6-billboard-glass-overlay">
              <span className="v6-billboard-tagline">“Helping thousands of patients and clinics every single day.”</span>
              <span className="v6-billboard-credit">Doc2Me Global Outdoor Campaign</span>
            </div>
          </div>
        </div>
      </section>

      {/* Drilldown Modal (30 Days Log) */}
      {selectedDrilldownBlock && (
        <div className="modal-backdrop-premium" onClick={() => setSelectedDrilldownBlock(null)} style={{ zIndex: 1000 }}>
          <div className="modal-content-premium modal-content-premium--drilldown" onClick={e => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modal-header-premium" style={{ borderBottom: "1px solid var(--v5-border-subtle)", paddingBottom: "14px", marginBottom: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="modal-icon-premium" style={{ color: "#FF7A00", fontSize: "1.5rem" }}>✦</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h2 className="modal-title-premium" style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600, color: "var(--v5-text-dark)" }}>
                  {selectedDrilldownBlock.label} Log (30 Days)
                </h2>
                <p style={{ margin: "2px 0 0 0", color: "var(--v5-text-muted)", fontSize: "12px", fontWeight: 400 }}>
                  Chronological history of registered readings
                </p>
              </div>
            </div>

            <div style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "4px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {(() => {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const matchingRecords = timeline.filter(
                  r => r.parameter === selectedDrilldownBlock.key && r.recordedAt && new Date(r.recordedAt).getTime() >= thirtyDaysAgo.getTime()
                ).sort((a, b) => new Date(b.recordedAt!).getTime() - new Date(a.recordedAt!).getTime());

                if (matchingRecords.length === 0) {
                  return <p style={{ fontStyle: "italic", color: "var(--v5-text-muted)", fontSize: "14px", textAlign: "center", margin: "20px 0" }}>No records found</p>;
                }

                return matchingRecords.map((rec, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "#FAFDFB",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: "8px",
                    fontSize: "14px"
                  }}>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--v5-text-muted)", fontWeight: 600, display: "block" }}>
                        {rec.timeContext ? rec.timeContext.charAt(0).toUpperCase() + rec.timeContext.slice(1) : ""} · {formatRecordDateTime(rec.recordedAt)}
                      </span>
                      {rec.parameter === "blood_sugar" && rec.context && formatGlucoseContext(rec.context) && (
                        <span style={{ fontSize: "12px", color: "#FF7A00", fontWeight: 600 }}>
                          {formatGlucoseContext(rec.context)}
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "16px", color: "var(--v5-text-dark)", fontWeight: 600 }}>
                        {rec.value} <span style={{ fontSize: "12px", opacity: 0.6, fontWeight: 400 }}>{rec.unit}</span>
                      </strong>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="modal-actions-premium" style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid var(--v5-border-subtle)", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn-premium btn-premium--secondary"
                onClick={() => setSelectedDrilldownBlock(null)}
                type="button"
                style={{ padding: "6px 16px", fontSize: "13px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardViewV6;
