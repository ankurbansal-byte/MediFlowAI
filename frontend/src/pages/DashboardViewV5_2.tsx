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

// Import project assets naturally with standard .png extension to blend into the storytelling
import homeHeroWhatsapp from "../assets/images/home-hero-whatsapp.png";
import doctorDashboard from "../assets/images/doctor-dashboard.png";
import cloudPlatformFlow from "../assets/images/cloud-platform-flow.png";
import healthReportFlow from "../assets/images/health-report-flow.png";

import "./DashboardV5_2.css";

const EditorialTransition: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="v52-editorial-divider-section">
      <div className="v52-editorial-line"></div>
      <p className="v52-editorial-quote-text">
        {text}
      </p>
      <div className="v52-editorial-line"></div>
    </div>
  );
};

interface DashboardViewV5_2Props {
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

const DashboardViewV5_2: React.FC<DashboardViewV5_2Props> = ({
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
          console.error("Error fetching lab observations in DashboardViewV5_2:", err);
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
    <div className="v52-page-canvas">

      {/* SECTION 1: HERO SECTION WITH PREMIUM BACKGROUND */}
      <section className="v52-hero-section">
        <div className="v52-hero-grid">
          {/* Left Column: Context & Copy */}
          <div className="v52-hero-content-column">
            <span className="v52-hero-eyebrow">
              ⚡ Medical Informatics Ecosystem V5.2
            </span>
            <h1 className="v52-hero-title">
              Welcome back, {user.fullName || user.username}
            </h1>
            <p className="v52-hero-body">
              Effortlessly track, analyze, and map your vital metrics in real-time. Just send a simple text or voice message on WhatsApp, and our medical intelligence parser organizes it for you instantly.
            </p>
            <div className="v52-hero-whatsapp-indicator">
              <span className="v52-whatsapp-dot"></span>
              <span className="v52-whatsapp-text">“Just message it. MediFlowAI organizes the rest.”</span>
            </div>
            <div className="v52-hero-id-badge">
              Clinical Space ID: {user.patientId || user.username}
            </div>
          </div>

          {/* Right Column: Natural Storytelling Image Integration & Flowchart */}
          <div className="v52-hero-visual-column">
            <div className="v52-storytelling-wrapper">
              <div className="v52-storytelling-card">
                <span className="v52-image-tag">WhatsApp Interface</span>
                <img src={homeHeroWhatsapp} alt="WhatsApp Medical Extraction Flow" className="v52-storytelling-image" />
                <p className="v52-image-caption">Secure, direct end-to-end conversation pipeline converting language into validated medical observations.</p>
              </div>

              <div className="v52-storytelling-card">
                <span className="v52-image-tag" style={{ background: "var(--v52-purple)" }}>Extraction Intelligence</span>
                <img src={healthReportFlow} alt="Clinical Extraction Flow Diagram" className="v52-storytelling-image" />
                <p className="v52-image-caption">AI-powered segment extraction separating vitals, clinical contexts, and timeframes deterministically.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <EditorialTransition text="“Your health is an ongoing story of quiet, daily choices. Every logged metric adds a word of clarity.”" />

      {/* SECTION 2: LATEST HEALTH SNAPSHOT */}
      <section className="v52-section-panel v52-bg-snapshot-panel" aria-labelledby="v52-snapshot-heading">
        <h2 id="v52-snapshot-heading" className="v52-panel-heading">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Latest Health Snapshot
        </h2>
        <p className="v52-panel-subtitle">
          Highly specialized physiological measurements tracked from your most recent conversational logs.
        </p>

        <div className="v52-snapshot-card-grid">
          {[
            { key: "blood_sugar", label: "Blood Sugar", icon: "🩸", fallbackUnit: "mg/dL", class: "blood_sugar", iconBg: "rgba(255,122,0,0.12)", tint: "#FFFBF7", borderCol: "var(--v52-orange)", tab: "trends" as TabType },
            { key: "blood_pressure", label: "Blood Pressure", icon: "🩺", fallbackUnit: "mmHg", class: "blood_pressure", iconBg: "rgba(14,165,233,0.12)", tint: "#F0F9FF", borderCol: "var(--v52-blue)", tab: "trends" as TabType },
            { key: "heart_rate", label: "Heart Rate", icon: "❤️", fallbackUnit: "bpm", class: "heart_rate", iconBg: "rgba(244,63,94,0.12)", tint: "#FFF5F5", borderCol: "var(--v52-rose)", tab: "trends" as TabType },
            { key: "body_temperature", label: "Temperature", icon: "🌡️", fallbackUnit: "°C", class: "body_temperature", iconBg: "rgba(234,179,8,0.12)", tint: "#FFFDF0", borderCol: "var(--v52-yellow)", tab: "trends" as TabType },
            { key: "weight", label: "Weight", icon: "⚖️", fallbackUnit: "kg", class: "weight", iconBg: "rgba(124,58,237,0.12)", tint: "#FAF5FF", borderCol: "var(--v52-purple)", tab: "trends" as TabType }
          ].map((param) => {
            const record = getLatestRecord(param.key);

            return (
              <div
                key={param.key}
                className={`v52-snapshot-slimmer-card ${param.class}`}
                style={{ borderLeft: `5px solid ${param.borderCol}` }}
                onClick={() => {
                  if (onTabChange) onTabChange(param.tab);
                }}
              >
                <div className="v52-snapshot-card-header">
                  <span className="v52-snapshot-card-label">{param.label}</span>
                  <div className="v52-snapshot-card-icon" style={{ background: param.iconBg }}>
                    {param.icon}
                  </div>
                </div>

                <div className="v52-snapshot-card-value-row">
                  {record ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                        <span className="v52-snapshot-numeric">{record.value}</span>
                        <span className="v52-snapshot-unit">{record.unit || param.fallbackUnit}</span>
                      </div>

                      {param.key === "blood_sugar" && record.context && formatGlucoseContext(record.context) && (
                        <span className="v52-glucose-badge">
                          {formatGlucoseContext(record.context)}
                        </span>
                      )}

                      <div className="v52-snapshot-time-stamp">
                        {record.timeContext ? (
                          `${record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1)} · ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(record.recordedAt!))}`
                        ) : (
                          formatRecordDateTime(record.recordedAt)
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="v52-snapshot-empty-state">No readings logged yet</span>
                  )}
                </div>

                {/* Explicit View More Action matching strict specifications */}
                <div className="v52-snapshot-card-footer">
                  <button
                    className="v52-view-more-action-button"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onTabChange) onTabChange(param.tab);
                    }}
                  >
                    View More
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <EditorialTransition text="“Knowledge of clinical trends is the beginning of health self-mastery.”" />

      {/* SECTION 3: TODAY'S HEALTH (WHATSAPP-INSPIRED BG) */}
      <section className="v52-section-panel v52-bg-today-panel" aria-labelledby="v52-today-heading">
        <div className="v52-today-section-grid">
          {/* Left panel: Timeline Activity */}
          <div className="v52-today-timeline-column">
            <div className="v52-today-header-row">
              <div>
                <h2 id="v52-today-heading" className="v52-panel-heading" style={{ margin: 0 }}>
                  🕒 Today's Health Logs
                </h2>
                <p className="v52-panel-subtitle" style={{ marginTop: "4px" }}>
                  {formatTodayDateHeader(new Date())} · {todayRecords.length} observation{todayRecords.length !== 1 ? "s" : ""} registered
                </p>
              </div>

              {/* Elegant manual entry action */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="v52-premium-manual-entry-button"
                type="button"
              >
                + Manual Entry
              </button>
            </div>

            {todayRecords.length === 0 ? (
              <div className="v52-today-empty-container">
                <p className="v52-today-empty-text">
                  No observations logged yet today. Update your vitals instantly by sending a message on WhatsApp!
                </p>
              </div>
            ) : (
              <div className="v52-today-logs-stack">
                {todayRecords.map((record, index) => {
                  const displayParam = record.parameter.replace("_", " ").toUpperCase().replace(/\b\w/g, c => c.toUpperCase());
                  const timeStr = formatTimeOnly(record.recordedAt);

                  return (
                    <div
                      key={index}
                      className="v52-today-log-card"
                      onClick={() => {
                        if (setSelectedHistoryDate) {
                          setSelectedHistoryDate(getLocalDateString(record.recordedAt));
                        }
                        if (onTabChange) {
                          onTabChange("trends");
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span className="v52-today-time-badge">
                          {record.timeContext ? record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1) : timeStr}
                        </span>
                        <strong className="v52-today-param-name">
                          {displayParam}
                        </strong>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong className="v52-today-param-value">
                          {record.value} <span style={{ fontSize: "12px", opacity: 0.6 }}>{record.unit}</span>
                          {record.parameter === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
                            <span className="v52-today-glucose-context-tag">
                              {formatGlucoseContext(record.context)}
                            </span>
                          ) : null}
                        </strong>
                        <span className="v52-arrow-indicator">→</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: High-Fidelity WhatsApp Smartphone Interface Mock */}
          <div className="v52-whatsapp-mock-column">
            <div className="v52-whatsapp-smartphone-container">
              {/* WhatsApp App header bar */}
              <div className="v52-whatsapp-header">
                <div className="v52-whatsapp-avatar">
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.011 2c-5.502 0-9.989 4.487-9.989 9.989 0 1.761.458 3.473 1.332 4.98L2 22l5.187-1.359c1.464.799 3.11 1.22 4.814 1.22 5.504 0 9.991-4.487 9.991-9.989A9.99 9.99 0 0012.011 2zm6.208 14.154c-.255.718-1.5 1.318-2.059 1.404-.499.077-1.154.144-3.328-.756-2.78-1.15-4.57-3.988-4.71-4.174-.139-.186-1.139-1.514-1.139-2.89 0-1.376.719-2.053.974-2.333.255-.279.558-.349.743-.349H9.3c.186 0 .442-.07.697.54.256.61.872 2.129.948 2.284.075.155.126.335.021.543-.103.208-.155.335-.308.513-.153.178-.322.396-.46.531-.155.15-.318.314-.136.626.182.312.809 1.331 1.734 2.157.925.826 1.707 1.08 2.025 1.213.318.133.504.111.693-.106.189-.217.809-.942 1.025-1.264.217-.322.433-.269.73-.159.297.109 1.886.889 2.213 1.053.328.164.546.244.626.382.081.138.081.802-.174 1.52z"/>
                  </svg>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700 }}>MediFlowAI Health Assistant</span>
                  <span style={{ fontSize: "10px", color: "#25D366", fontWeight: 700 }}>Online & Processing</span>
                </div>
              </div>

              {/* Chat conversations screen */}
              <div className="v52-whatsapp-chat-body">
                {/* User bubble */}
                <div className="v52-whatsapp-bubble user">
                  <div>Mera sugar level fasting me 110 hai aur BP 120/80 hai</div>
                  <div className="v52-whatsapp-bubble-meta">
                    <span>08:15 AM</span>
                    <span className="v52-whatsapp-ticks">✓✓</span>
                  </div>
                </div>

                {/* System response bubble */}
                <div className="v52-whatsapp-bubble system">
                  <div className="v52-whatsapp-system-title">MediFlowAI Clinical Core</div>
                  <div>Fasting Blood Sugar of <strong>110 mg/dL</strong> and Blood Pressure of <strong>120/80 mmHg</strong> logged successfully! 🩺🩸</div>
                  <div className="v52-whatsapp-bubble-meta" style={{ color: "#8c7b65" }}>
                    08:15 AM
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <EditorialTransition text="“Pathology measurements don't simply describe our disease, they frame our biological journey.”" />

      {/* SECTION 4: YOUR HEALTH AT A GLANCE (30-DAY HEALTH SUMMARY WITH PREMIUM BG) */}
      <section className="v52-section-panel v52-bg-summary-panel" aria-labelledby="v52-glance-heading">
        <div className="v52-summary-header-row">
          <div>
            <h2 id="v52-glance-heading" className="v52-panel-heading" style={{ margin: 0 }}>
              Your Health at a Glance
            </h2>
            <p className="v52-panel-subtitle" style={{ marginTop: "4px" }}>
              Longitudinal analysis calculated across the previous 30 days of conversational vital logs.
            </p>
          </div>

          {/* Toggle buttons */}
          <div className="v52-summary-toggle-group">
            <button
              type="button"
              className={`v52-summary-toggle-button ${summaryMode === "summary" ? "active" : ""}`}
              onClick={() => setSummaryMode("summary")}
            >
              Summary Text
            </button>
            <button
              type="button"
              className={`v52-summary-toggle-button ${summaryMode === "report" ? "active" : ""}`}
              onClick={() => setSummaryMode("report")}
            >
              Structured Report
            </button>
          </div>
        </div>

        {(() => {
          const paramStyles: Record<string, { border: string, text: string, bg: string }> = {
            blood_sugar: { border: "var(--v52-orange)", text: "var(--v52-orange)", bg: "#FFFBF7" },
            blood_pressure: { border: "var(--v52-blue)", text: "var(--v52-blue)", bg: "#F0F9FF" },
            heart_rate: { border: "var(--v52-rose)", text: "var(--v52-rose)", bg: "#FFF5F5" },
            body_temperature: { border: "var(--v52-yellow)", text: "var(--v52-yellow)", bg: "#FFFDF0" },
            weight: { border: "var(--v52-purple)", text: "var(--v52-purple)", bg: "#FAF5FF" }
          };

          return summaryMode === "summary" ? (
            <div className="v52-summary-narrative-stack">
              {hasAnyFactualSummaryData ? (
                factualSummaryBlocks.map((block) => {
                  const config = paramStyles[block.key] || { border: "var(--v5-border-subtle)", text: "var(--v5-text-dark)", bg: "var(--v5-bg-white)" };

                  return (
                    <div
                      key={block.key}
                      className="v52-summary-narrative-card"
                      style={{
                        borderLeft: `5px solid ${config.border}`,
                        background: config.bg
                      }}
                    >
                      <strong className="v52-narrative-card-header" style={{ color: config.text }}>
                        {block.label}
                      </strong>
                      <p className="v52-narrative-card-body" style={{ fontStyle: block.hasData ? "normal" : "italic" }}>
                        {block.text}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="v52-summary-narrative-card empty">
                  <span style={{ color: "var(--v5-text-muted)", fontStyle: "italic" }}>No parameters logged in the last 30 days.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="v52-summary-structured-grid">
              {factualSummaryBlocks.map((block) => {
                const isClickable = block.hasData;
                const config = paramStyles[block.key] || { border: "var(--v5-border-subtle)", text: "var(--v5-text-dark)", bg: "var(--v5-bg-white)" };

                return (
                  <div
                    key={block.key}
                    onClick={() => isClickable && setSelectedDrilldownBlock(block)}
                    className={`v52-glance-metric-card ${block.key} ${isClickable ? "clickable" : ""}`}
                    style={{
                      background: config.bg,
                      borderLeft: `5px solid ${config.border}`
                    }}
                  >
                    <div className="v52-glance-card-top">
                      <strong className="v52-glance-card-heading" style={{ color: config.text }}>{block.label}</strong>
                      {isClickable && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11px", color: config.text, fontWeight: 700 }}>Explore</span>
                          <span style={{ fontSize: "11px", color: config.text }}>→</span>
                        </div>
                      )}
                    </div>

                    {block.hasData && block.metrics ? (
                      <div className="v52-glance-card-metrics-table">
                        <div className="v52-glance-card-row">
                          <span className="v52-glance-row-label">Latest:</span>
                          <strong className="v52-glance-row-value">{block.metrics.latest}</strong>
                        </div>
                        <div className="v52-glance-card-row">
                          <span className="v52-glance-row-label">Average:</span>
                          <strong className="v52-glance-row-value">{block.metrics.average}</strong>
                        </div>
                        <div className="v52-glance-card-row">
                          <span className="v52-glance-row-label">Total Logs:</span>
                          <strong className="v52-glance-row-value">{block.metrics.count} readings</strong>
                        </div>
                      </div>
                    ) : (
                      <span className="v52-glance-card-empty">
                        No logs registered
                      </span>
                    )}

                    <div className="v52-glance-card-footer">
                      <button
                        className="v52-glance-action-button"
                        type="button"
                        style={{ background: config.border }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isClickable) {
                            setSelectedDrilldownBlock(block);
                          }
                        }}
                      >
                        View More
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="v52-clinical-disclaimer-card">
          ⚠️ <strong>Clinical Disclaimer:</strong> Automatically computed strictly from patient-reported measurements. This is for reference only and does not constitute formal medical diagnosis, advice, or treatment changes.
        </div>
      </section>

      <EditorialTransition text="“Pathology documents speak a vocabulary of chemical constants. Translating them accurately requires absolute structural commitment.”" />

      {/* SECTION 5: LAB RESULTS */}
      <section className="v52-section-panel v52-bg-labs-panel" aria-labelledby="v52-labs-heading">
        <div className="v52-labs-header-row">
          <div>
            <span className="v52-labs-specimen-badge">
              🔬 SPECIMEN REPORT CARD
            </span>
            <h2 id="v52-labs-heading" className="v52-panel-heading" style={{ margin: 0 }}>
              Clinical Laboratory Results
            </h2>
            <p className="v52-panel-subtitle" style={{ marginTop: "4px" }}>
              Fully structured pathological readings parsed from document scans uploaded via WhatsApp.
            </p>
          </div>

          {onTabChange && (
            <button
              onClick={() => onTabChange("trends")}
              className="v52-labs-explore-history-button"
            >
              Explore history →
            </button>
          )}
        </div>

        <div className="v52-labs-layout-grid">
          {/* Left panel: Data list */}
          <div className="v52-labs-list-column">
            {isLabsLoading ? (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--v5-text-muted)" }}>
                Loading lab findings...
              </div>
            ) : hasLabsError ? (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--v5-brand-coral)" }}>
                Failed to retrieve laboratory records.
              </div>
            ) : labObservations.length === 0 ? (
              <div className="v52-labs-empty-state-container">
                <span className="v52-labs-empty-text-main">No laboratory records found</span>
                <span style={{ color: "var(--v5-text-muted)", fontSize: "12px" }}>Once you upload lab report documents on WhatsApp, they will be organized here securely.</span>
              </div>
            ) : (
              <div className="v52-labs-observations-stack">
                {labObservations.slice(0, 3).map((obs, idx) => {
                  const isAbnormal = obs.flag && (obs.flag.toLowerCase() === "high" || obs.flag.toLowerCase() === "low");

                  return (
                    <div key={idx} className="v52-labs-observation-row" style={{ borderLeft: `5px solid var(--v52-teal)` }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span className="v52-labs-row-specimen-label">
                            Specimen
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--v5-text-muted)", fontWeight: 500 }}>
                            {new Date(obs.specimenDate || obs.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <strong className="v52-labs-row-test-name">
                          {obs.testName}
                        </strong>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <strong className="v52-labs-row-value-text">
                            {obs.value} <span style={{ fontSize: "12px", opacity: 0.6, fontWeight: 400 }}>{obs.unit}</span>
                          </strong>
                        </div>
                        {obs.flag && (
                          <span className={`v52-labs-flag-pill ${isAbnormal ? "high" : "normal"}`}>
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

          {/* Right panel: Storytelling asset showing medical dashboard or pipeline */}
          <div className="v52-labs-visual-column">
            <div className="v52-storytelling-card specimen">
              <span className="v52-image-tag" style={{ background: "var(--v52-teal)" }}>Clinical Dashboard</span>
              <img src={doctorDashboard} alt="Clinician Analytics Panel" className="v52-storytelling-image" />
              <p className="v52-image-caption">Direct workspace sync, allowing your treating clinician or hospital team to review longitudinal updates instantly.</p>
            </div>
          </div>
        </div>
      </section>

      <EditorialTransition text="“Health trends display the geometric path of physiological constants. Mapping them transforms numbers into knowledge.”" />

      {/* SECTION 6: ANALYZE TRENDS (PREMIUM COLORED BACKGROUND) */}
      <section className="v52-section-panel v52-bg-trends-panel" aria-labelledby="v52-trends-heading">
        <div className="v52-dual-grid-cta">
          {/* Left panel: Info */}
          <div className="v52-cta-content-card">
            <span className="v52-cta-eyebrow" style={{ color: "var(--v52-orange)" }}>Continuous Progress</span>
            <h2 id="v52-trends-heading" className="v52-panel-heading" style={{ margin: "8px 0 10px 0" }}>
              Analyze Longitudinal Trends
            </h2>
            <p className="v52-panel-subtitle">
              Visualize chronological charts, group logs by calendar date, and filter readings seamlessly by parameter or category. Keep complete control over your health parameters.
            </p>
            {onTabChange && (
              <button className="v52-cta-action-button orange" onClick={() => onTabChange("trends")}>
                Explore Trends →
              </button>
            )}
          </div>

          {/* Right panel: Storytelling Asset */}
          <div className="v52-cta-visual-card">
            <div className="v52-storytelling-card trends">
              <span className="v52-image-tag" style={{ background: "var(--v52-orange)" }}>Pathology Ecosystem</span>
              <img src={cloudPlatformFlow} alt="Cloud Medical Analytics Diagram" className="v52-storytelling-image" />
              <p className="v52-image-caption">Cloud analytics processing pipeline synchronizing WhatsApp conversational data with analytical timelines securely.</p>
            </div>
          </div>
        </div>
      </section>

      <EditorialTransition text="“Intelligence is the capacity to detect coherence within chaos. Medical AI organizes your signals so you can hear what your body says.”" />

      {/* SECTION 7: AI HEALTH INSIGHTS (PREMIUM COLORED BACKGROUND) */}
      <section className="v52-section-panel v52-bg-insights-panel" aria-labelledby="v52-insights-heading">
        <div className="v52-dual-grid-cta">
          {/* Left panel: Storytelling Asset */}
          <div className="v52-cta-visual-card">
            <div className="v52-storytelling-card insights">
              <span className="v52-image-tag" style={{ background: "var(--v52-purple)" }}>Informatics Ecosystem</span>
              <img src={cloudPlatformFlow} alt="MediFlowAI Cloud Pipeline Flow" className="v52-storytelling-image" />
              <p className="v52-image-caption">Advanced language model pipeline ensuring clean extraction constraints, emergency fallback warnings, and context mapping.</p>
            </div>
          </div>

          {/* Right panel: Info */}
          <div className="v52-cta-content-card">
            <span className="v52-cta-eyebrow" style={{ color: "var(--v52-purple)" }}>AI Diagnostics</span>
            <h2 id="v52-insights-heading" className="v52-panel-heading" style={{ margin: "8px 0 10px 0" }}>
              AI Health Insights Hub
            </h2>
            <p className="v52-panel-subtitle">
              Receive highly personalized, supportive narrative summaries mapping out your metrics. Grounded strictly in factual logs, avoiding diagnostic fabrication.
            </p>
            {onTabChange && (
              <button className="v52-cta-action-button purple" onClick={() => onTabChange("ai-insights")}>
                Open Insights Hub ✦
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Drilldown Modal (30 Days Log) */}
      {selectedDrilldownBlock && (
        <div className="modal-backdrop-premium" onClick={() => setSelectedDrilldownBlock(null)} style={{ zIndex: 1000 }}>
          <div className="modal-content-premium modal-content-premium--drilldown" onClick={e => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modal-header-premium" style={{ borderBottom: "1px solid var(--v5-border-subtle)", paddingBottom: "14px", marginBottom: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="modal-icon-premium" style={{ color: "var(--v5-brand-orange)", fontSize: "1.5rem" }}>✦</span>
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
                    background: "var(--v5-bg-cream)",
                    border: "1px solid var(--v5-border-subtle)",
                    borderRadius: "8px",
                    fontSize: "14px"
                  }}>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--v5-text-muted)", fontWeight: 600, display: "block" }}>
                        {rec.timeContext ? rec.timeContext.charAt(0).toUpperCase() + rec.timeContext.slice(1) : ""} · {formatRecordDateTime(rec.recordedAt)}
                      </span>
                      {rec.parameter === "blood_sugar" && rec.context && formatGlucoseContext(rec.context) && (
                        <span style={{ fontSize: "12px", color: "var(--v5-brand-orange)", fontWeight: 600 }}>
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

export default DashboardViewV5_2;
