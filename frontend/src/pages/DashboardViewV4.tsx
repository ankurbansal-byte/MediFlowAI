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
import "./DashboardV4.css";

const SectionDivider: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="v4-section-divider">
      <div className="v4-divider-line" />
      <span className="v4-divider-sparkle">✦ {text}</span>
      <div className="v4-divider-line" />
    </div>
  );
};

interface DashboardViewV4Props {
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

const DashboardViewV4: React.FC<DashboardViewV4Props> = ({
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
  const [selectedDrilldown, setSelectedDrilldown] = useState<any | null>(null);

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
          console.error("Error fetching lab observations in DashboardViewV4:", err);
          setHasLabsError(true);
        })
        .finally(() => {
          setIsLabsLoading(false);
        });
    }
  }, [effectivePatientId]);

  // Compute Descriptive health statistics for the last 30 days
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
          text: `No ${p.label.toLowerCase()} readings registered in the last 30 days.`,
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
          text: `Last 30 Days: ${records.length} BP records. Average: ${avgSys}/${avgDia} mmHg. Range: ${minSys}/${minDia} to ${maxSys}/${maxDia} mmHg. Latest: ${latestVal} mmHg.`,
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
          text: `No numerical ${p.label.toLowerCase()} readings registered.`,
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
        text: `Last 30 Days: ${records.length} ${p.label.toLowerCase()} logs. Average: ${avgVal} ${p.unit}. Range: ${minVal}–${maxVal} ${p.unit}. Latest: ${latestVal} ${p.unit}.`,
        metrics: {
          latest: `${latestVal} ${p.unit}`,
          average: `${avgVal} ${p.unit}`,
          range: `${minVal} – ${maxVal} ${p.unit}`,
          count: records.length
        }
      };
    });
  }, [timeline]);

  const getLatestRecord = (key: string) => {
    if (!summary) return null;
    const record = (summary as Record<string, { value?: string | number; unit?: string; context?: string; timeContext?: string; recordedAt?: string } | undefined>)[key];
    if (!record || record.value === undefined || record.value === null) return null;
    return record;
  };

  // Filter Today's chronological logs
  const todayRecords = timeline
    .filter(r => r.recordedAt && getLocalDateString(r.recordedAt) === getLocalDateString(new Date()))
    .sort((a, b) => {
      const tA = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
      const tB = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
      if (tA !== tB) return tB - tA;
      const order = { morning: 1, afternoon: 2, evening: 3, night: 4 };
      const valA = order[(a.timeContext || "") as keyof typeof order] || 0;
      const valB = order[(b.timeContext || "") as keyof typeof order] || 0;
      return valB - valA;
    });

  const formatTodayHeader = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
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
    <div className="v4-mediflow-container" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* HERO SECTION: THE VISUAL STORY */}
      <div className="v4-hero-panel">
        <div style={{ maxWidth: "600px" }}>
          <span style={{
            background: "var(--v4-brand-mango-light)",
            color: "var(--v4-brand-mango)",
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "5px 10px",
            borderRadius: "6px",
            display: "inline-block",
            marginBottom: "12px"
          }}>
            ✨ Introducing V4 Patient Experience
          </span>
          <h1 className="v4-page-heading">
            Welcome, {user.fullName || user.username}
          </h1>
          <p className="v4-body-desc" style={{ fontSize: "16px", marginTop: "10px" }}>
            MediFlow V4 bridges the gap between everyday communication and health tracking. There is no need to navigate complex dashboards or hospital ERPs. Simply chat naturally on WhatsApp, and let our medical AI coordinate the details.
          </p>
        </div>

        {/* The impressive visual journey flow steps */}
        <div className="v4-flowchart-grid">
          <div className="v4-flow-step whatsapp">
            <div className="v4-flow-icon-wrap">💬</div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--v4-text-dark)" }}>WhatsApp</span>
            <span style={{ fontSize: "10px", color: "var(--v4-text-muted)" }}>Send a natural message</span>
          </div>

          <div className="v4-flow-arrow">➔</div>

          <div className="v4-flow-step ai">
            <div className="v4-flow-icon-wrap">🧠</div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--v4-text-dark)" }}>Medical AI</span>
            <span style={{ fontSize: "10px", color: "var(--v4-text-muted)" }}>Structured clinical extraction</span>
          </div>

          <div className="v4-flow-arrow">➔</div>

          <div className="v4-flow-step record">
            <div className="v4-flow-icon-wrap">📋</div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--v4-text-dark)" }}>Health Record</span>
            <span style={{ fontSize: "10px", color: "var(--v4-text-muted)" }}>Persisted chronologically</span>
          </div>
        </div>
      </div>

      <SectionDivider text="Everyday Updates" />

      {/* TODAY'S HEALTH & SMARTPHONE INTEGRATION */}
      <section className="v4-today-card" aria-labelledby="v4-today-health-title">
        <div className="v4-today-layout">

          <div className="v4-today-logs-col">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
              <div>
                <h2 id="v4-today-health-title" className="v4-section-title" style={{ margin: 0 }}>
                  🕒 Today's Health Logs
                </h2>
                <p className="v4-card-eyebrow" style={{ color: "#15803d", marginTop: "4px" }}>
                  {formatTodayHeader(new Date())} · {todayRecords.length} metric{todayRecords.length !== 1 ? "s" : ""} registered
                </p>
              </div>

              {/* Explicit manual button that conforms to WhatsApp hint guidelines */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="whatsapp-info-hint"
                style={{
                  background: "var(--v4-bg-white)",
                  border: "1.5px solid var(--v4-border-subtle)",
                  color: "var(--v4-text-dark)",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                }}
              >
                + Register Metric
              </button>
            </div>

            {todayRecords.length === 0 ? (
              <div style={{ background: "var(--v4-bg-white)", padding: "20px", borderRadius: "12px", border: "1px dashed var(--v4-border-subtle)", textAlign: "center" }}>
                <p className="v4-body-desc" style={{ margin: 0, fontStyle: "italic" }}>
                  No records registered today. Send a WhatsApp update to automatically synchronize your vitals!
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {todayRecords.map((rec, i) => {
                  const paramLabel = rec.parameter.replace("_", " ").toUpperCase();
                  const tStr = formatTimeOnly(rec.recordedAt);

                  return (
                    <div
                      key={i}
                      className="v4-today-item-row today-record-row table-row-hover"
                      onClick={() => {
                        if (setSelectedHistoryDate) {
                          setSelectedHistoryDate(getLocalDateString(rec.recordedAt));
                        }
                        if (onTabChange) {
                          onTabChange("trends");
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, background: "rgba(37, 211, 102, 0.1)", color: "#15803d", padding: "3px 8px", borderRadius: "8px" }}>
                          {rec.timeContext ? rec.timeContext.toUpperCase() : tStr}
                        </span>
                        <strong style={{ fontSize: "14px", color: "var(--v4-text-dark)" }}>
                          {paramLabel}
                        </strong>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "15px", fontWeight: 700 }}>
                          {rec.value} <span style={{ fontSize: "12px", opacity: 0.6, fontWeight: 400 }}>{rec.unit}</span>
                          {rec.parameter === "blood_sugar" && rec.context && (
                            <span style={{ fontSize: "10px", background: "var(--v4-brand-mango-light)", color: "var(--v4-brand-mango)", padding: "2px 6px", borderRadius: "4px", marginLeft: "6px", fontWeight: 700 }}>
                              {formatGlucoseContext(rec.context)}
                            </span>
                          )}
                        </span>
                        <span style={{ color: "var(--v4-text-muted)" }}>➜</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Premium High-Fidelity Smartphone Mock */}
          <div className="v4-phone-mockup">
            <div className="v4-phone-header">
              <div className="v4-phone-avatar">💬</div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700 }}>MediFlow Assistant</div>
                <div style={{ fontSize: "10px", color: "var(--v4-brand-green)", fontWeight: 700 }}>AI Sync Agent Online</div>
              </div>
            </div>

            <div className="v4-phone-chat-area">
              <div className="v4-whatsapp-bubble-user">
                Mera sugar level fasting me 110 hai aur BP 120/80 hai
              </div>
              <div className="v4-whatsapp-bubble-ai">
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--v4-brand-green)", display: "block", marginBottom: "2px" }}>SYSTEM SYNCED</span>
                Fasting Sugar of <strong>110 mg/dL</strong> and Blood Pressure of <strong>120/80 mmHg</strong> safely stored! 🩺🩸
              </div>
            </div>
          </div>

        </div>
      </section>

      <SectionDivider text="Visual Snapshots" />

      {/* LATEST HEALTH SNAPSHOT: ASYMMETRIC MOSAIC */}
      <section aria-labelledby="v4-snapshot-title">
        <h2 id="v4-snapshot-title" className="v4-section-title">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ color: "var(--v4-brand-mango)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Current Wellness Snapshots
        </h2>

        <div className="v4-mosaic-grid">
          {[
            { key: "blood_sugar", label: "Blood Sugar", icon: "🩸", unit: "mg/dL", class: "blood_sugar", tint: "#FEF3C7" },
            { key: "blood_pressure", label: "Blood Pressure", icon: "🩺", unit: "mmHg", class: "blood_pressure", tint: "#E0F2FE" },
            { key: "heart_rate", label: "Heart Rate", icon: "❤️", unit: "bpm", class: "heart_rate", tint: "#FFE4E6" },
            { key: "body_temperature", label: "Temperature", icon: "🌡️", unit: "°C", class: "body_temperature", tint: "#FFFBEB" },
            { key: "weight", label: "Weight", icon: "⚖️", unit: "kg", class: "weight", tint: "#F3E8FF" }
          ].map((item) => {
            const record = getLatestRecord(item.key);

            return (
              <div key={item.key} className={`v4-mosaic-card ${item.class}`} style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="v4-card-eyebrow">{item.label}</span>
                  <span style={{ fontSize: "20px" }}>{item.icon}</span>
                </div>

                {record ? (
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                      <span style={{ fontSize: "38px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--v4-text-dark)" }}>{record.value}</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--v4-text-muted)" }}>{record.unit || item.unit}</span>
                    </div>

                    {item.key === "blood_sugar" && record.context && (
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        background: "var(--v4-brand-mango)",
                        color: "var(--v4-bg-white)",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        display: "inline-block",
                        marginTop: "4px"
                      }}>
                        {formatGlucoseContext(record.context).toUpperCase()}
                      </span>
                    )}

                    <div style={{ marginTop: "14px", borderTop: "1.5px solid var(--v4-border-subtle)", paddingTop: "8px", fontSize: "11px", color: "var(--v4-text-muted)" }}>
                      {record.timeContext ? (
                        `${record.timeContext.toUpperCase()} · ${new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(new Date(record.recordedAt!))}`
                      ) : (
                        formatRecordDateTime(record.recordedAt)
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: "16px", fontStyle: "italic", fontSize: "13px", color: "var(--v4-text-muted)" }}>
                    No readings registered
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <SectionDivider text="Chronological Timeline" />

      {/* HEALTH TIMELINE TREE */}
      <section className="v4-timeline-box" aria-labelledby="v4-timeline-title">
        <h2 id="v4-timeline-title" className="v4-section-title">
          📋 My Longitudinal Health Tree
        </h2>

        {timeline.length === 0 ? (
          <p style={{ fontStyle: "italic", color: "var(--v4-text-muted)", fontSize: "14px", margin: 0 }}>
            No health records registered in your timeline.
          </p>
        ) : (
          <div className="v4-timeline-tree">
            {timeline.slice(0, 5).map((rec, i) => {
              const displayLabel = rec.parameter.replace("_", " ").toUpperCase();
              return (
                <div key={i} className="v4-timeline-node">
                  <div className="v4-timeline-bullet" />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--v4-bg-white)", border: "1.5px solid var(--v4-border-subtle)", borderRadius: "12px", padding: "14px 18px" }}>
                    <div>
                      <strong style={{ fontSize: "14px", color: "var(--v4-text-dark)" }}>{displayLabel}</strong>
                      <span style={{ fontSize: "11px", color: "var(--v4-text-muted)", display: "block", marginTop: "2px" }}>
                        {rec.timeContext ? rec.timeContext.toUpperCase() : ""} · {formatRecordDateTime(rec.recordedAt)}
                      </span>
                    </div>

                    <div>
                      <strong style={{ fontSize: "16px", color: "var(--v4-text-dark)" }}>
                        {rec.value} <span style={{ fontSize: "12px", opacity: 0.6, fontWeight: 400 }}>{rec.unit}</span>
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SectionDivider text="Diagnostic Summary" />

      {/* AI NARRATIVE CLINICAL SUMMARY */}
      <section className="v4-ai-box" aria-labelledby="v4-ai-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
          <div>
            <h2 id="v4-ai-title" className="v4-section-title" style={{ margin: 0 }}>
              🧠 AI Health Insights (30 Days)
            </h2>
            <p className="v4-body-desc" style={{ color: "var(--v4-brand-purple)", fontWeight: 500, marginTop: "4px" }}>
              Narrative wellness coordination computed directly from your WhatsApp observations.
            </p>
          </div>
        </div>

        <div className="v4-ai-letter">
          <div className="v4-ai-letter-header">
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--v4-brand-purple)" }}>✦ PERSONAL DIAGNOSTIC BRIEF</span>
            <span style={{ fontSize: "12px", color: "var(--v4-text-muted)" }}>Last updated: Just now</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {factualSummaryBlocks.map((block) => {
              const hasData = block.hasData;
              return (
                <div key={block.key} style={{ borderBottom: "1.5px solid var(--v4-border-subtle)", paddingBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: "13px", textTransform: "uppercase", color: "var(--v4-text-dark)" }}>{block.label}</strong>
                    {hasData && (
                      <button
                        onClick={() => setSelectedDrilldown(block)}
                        style={{ background: "none", border: "none", color: "var(--v4-brand-purple)", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                      >
                        Drill Down ➔
                      </button>
                    )}
                  </div>
                  <p style={{ margin: "6px 0 0 0", fontSize: "13.5px", color: "var(--v4-text-muted)" }}>
                    {block.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "20px", padding: "12px 16px", background: "rgba(124, 58, 237, 0.03)", border: "1px dashed #E2D1F9", borderRadius: "8px", fontSize: "11px", color: "var(--v4-text-muted)", lineHeight: "1.4" }}>
            ⚠️ <strong>Clinical Disclaimer:</strong> Derived automatically from patient-submitted parameters. This briefing does not replace expert medical diagnosis or treatment plan decisions.
          </div>
        </div>
      </section>

      <SectionDivider text="Laboratory Specimen" />

      {/* LABS PATHOLOGY SPECIMEN CARD */}
      <section className="v4-labs-invoice-card" aria-labelledby="v4-labs-invoice-title">
        <h2 id="v4-labs-invoice-title" className="v4-section-title">
          🔬 Pathology Specimen Report
        </h2>

        <div className="v4-labs-receipt">
          <div className="v4-labs-header">
            <div>
              <strong style={{ fontSize: "15px", color: "var(--v4-text-dark)" }}>METRIC SPECIMENS</strong>
              <span style={{ fontSize: "11px", color: "var(--v4-text-muted)", display: "block" }}>MediFlow Diagnostic Lab Partner</span>
            </div>

            {onTabChange && (
              <button
                onClick={() => onTabChange("trends")}
                style={{ background: "none", border: "1.5px solid var(--v4-brand-yellow)", color: "var(--v4-brand-amber)", padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
              >
                Lab History ➔
              </button>
            )}
          </div>

          {isLabsLoading ? (
            <p style={{ fontStyle: "italic", color: "var(--v4-text-muted)", fontSize: "13px" }}>Loading lab records...</p>
          ) : hasLabsError ? (
            <p style={{ color: "var(--v4-brand-rose)", fontSize: "13px" }}>Failed to retrieve laboratory records.</p>
          ) : labObservations.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "var(--v4-text-muted)", fontSize: "13px" }}>No laboratory records found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", padding: "8px 16px", borderBottom: "2px solid var(--v4-border-subtle)", fontSize: "11px", fontWeight: 700, color: "var(--v4-text-muted)", textTransform: "uppercase" }}>
                <span>Test Specification</span>
                <span>Observation</span>
                <span style={{ textAlign: "right" }}>Flag Status</span>
              </div>

              {labObservations.slice(0, 3).map((obs, idx) => {
                const isAbnormal = obs.flag && (obs.flag.toLowerCase() === "high" || obs.flag.toLowerCase() === "low");

                return (
                  <div key={idx} className="v4-lab-row">
                    <div>
                      <strong style={{ fontSize: "14px", color: "var(--v4-text-dark)" }}>{obs.testName}</strong>
                      <span style={{ fontSize: "11px", color: "var(--v4-text-muted)", display: "block" }}>
                        Registered: {new Date(obs.specimenDate || obs.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                      <strong style={{ fontSize: "15px" }}>{obs.value}</strong>
                      <span style={{ fontSize: "11px", opacity: 0.7 }}>{obs.unit}</span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      {obs.flag && (
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "4px",
                          background: isAbnormal ? "var(--v4-brand-rose-light)" : "var(--v4-brand-green-light)",
                          color: isAbnormal ? "var(--v4-brand-rose)" : "var(--v4-brand-green)",
                          border: isAbnormal ? "1px solid #FECDD3" : "1px solid #A7F3D0"
                        }}>
                          {obs.flag.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <SectionDivider text="Take Action" />

      {/* SIBLING CTA GATEWAYS */}
      {onTabChange && (
        <section className="v4-cta-container">
          <div className="v4-cta-card-surface trends">
            <div>
              <span className="v4-card-eyebrow" style={{ color: "var(--v4-brand-mango)" }}>Trends Engine</span>
              <h3 style={{ fontSize: "18px", fontWeight: 600, margin: "8px 0" }}>Longitudinal Trends</h3>
              <p className="v4-body-desc">
                Review complete analytical metrics, navigate past dates with the calendars, and filter parameters.
              </p>
            </div>
            <button className="v4-cta-button" onClick={() => onTabChange("trends")}>Open Trends ➔</button>
          </div>

          <div className="v4-cta-card-surface insights">
            <div>
              <span className="v4-card-eyebrow" style={{ color: "var(--v4-brand-purple)" }}>Intelligence Hub</span>
              <h3 style={{ fontSize: "18px", fontWeight: 600, margin: "8px 0" }}>AI Health Insights</h3>
              <p className="v4-body-desc">
                Engage with our supportive dialogue system regarding your medical measurements.
              </p>
            </div>
            <button className="v4-cta-button" onClick={() => onTabChange("ai-insights")}>Open Insights ✦</button>
          </div>
        </section>
      )}

      {/* Narrative Drilldown Modal (30 Days Log) */}
      {selectedDrilldown && (
        <div className="modal-backdrop-premium" onClick={() => setSelectedDrilldown(null)} style={{ zIndex: 1000 }}>
          <div className="modal-content-premium modal-content-premium--drilldown" onClick={e => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header-premium" style={{ borderBottom: "1.5px solid var(--v4-border-subtle)", paddingBottom: "12px", marginBottom: "18px" }}>
              <h2 className="modal-title-premium" style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>
                {selectedDrilldown.label} 30-Day Details
              </h2>
              <p style={{ margin: "2px 0 0 0", color: "var(--v4-text-muted)", fontSize: "12px" }}>
                Historical log parsed from WhatsApp messages
              </p>
            </div>

            <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingRight: "4px" }}>
              {(() => {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const records = timeline.filter(
                  r => r.parameter === selectedDrilldown.key && r.recordedAt && new Date(r.recordedAt).getTime() >= thirtyDaysAgo.getTime()
                ).sort((a, b) => new Date(b.recordedAt!).getTime() - new Date(a.recordedAt!).getTime());

                if (records.length === 0) {
                  return <p style={{ fontStyle: "italic", color: "var(--v4-text-muted)", textAlign: "center", margin: "20px 0" }}>No records found</p>;
                }

                return records.map((rec, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--v4-bg-cream)", border: "1px solid var(--v4-border-subtle)", borderRadius: "8px" }}>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--v4-text-muted)", fontWeight: 700, display: "block" }}>
                        {rec.timeContext ? rec.timeContext.toUpperCase() : ""} · {formatRecordDateTime(rec.recordedAt)}
                      </span>
                      {rec.parameter === "blood_sugar" && rec.context && (
                        <span style={{ fontSize: "11px", color: "var(--v4-brand-mango)", fontWeight: 700 }}>
                          {formatGlucoseContext(rec.context)}
                        </span>
                      )}
                    </div>
                    <strong style={{ fontSize: "15px" }}>
                      {rec.value} <span style={{ fontSize: "11px", opacity: 0.6, fontWeight: 400 }}>{rec.unit}</span>
                    </strong>
                  </div>
                ));
              })()}
            </div>

            <div className="modal-actions-premium" style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn-premium btn-premium--secondary"
                onClick={() => setSelectedDrilldown(null)}
                type="button"
                style={{ padding: "6px 14px", fontSize: "12px" }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardViewV4;
