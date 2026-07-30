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
import "./DashboardV3.css";

interface DashboardViewV3Props {
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

const DashboardViewV3: React.FC<DashboardViewV3Props> = ({
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
          console.error("Error fetching lab observations in DashboardViewV3:", err);
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
    <div className="dashboard--v3 v3-mediflow-pattern" style={{ display: "flex", flexDirection: "column", gap: "32px", padding: "16px 24px" }}>

      {/* SECTION 1: HERO SECTION - REIMAGINED VISUAL JOURNEY */}
      <div className="v3-hero">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "center" }}>

          {/* Left Side: Welcoming Content */}
          <div className="v3-hero-left">
            <span style={{
              background: "var(--v3-brand-green-light)",
              color: "#065F46",
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "4px 10px",
              borderRadius: "4px",
              alignSelf: "flex-start",
              marginBottom: "12px"
            }}>
              ⚡ MediFlowAI Home V3
            </span>
            <h1 className="v3-display" style={{ margin: "0 0 12px 0", fontSize: "32px" }}>
              Welcome back, {user.fullName || user.username}
            </h1>
            <p className="v3-body" style={{ color: "var(--v3-text-muted)", fontSize: "15px", margin: "0 0 20px 0", maxWidth: "440px" }}>
              Effortlessly track your vital metrics in real-time. Just send a simple text or voice message on WhatsApp, and our medical intelligence parser organizes it for you instantly.
            </p>
            <div style={{ fontSize: "12px", color: "var(--v3-brand-orange)", fontWeight: 600, background: "#FFF0E0", padding: "6px 14px", borderRadius: "6px", alignSelf: "flex-start" }}>
              ID: {user.patientId || user.username}
            </div>
          </div>

          {/* Right Side: Flowchart Visual Journey */}
          <div className="v3-journey-visual">

            {/* Step 1: WhatsApp Message Card */}
            <div className="v3-journey-card-v3 whatsapp">
              <span className="v3-eyebrow" style={{ color: "var(--v3-brand-green)", display: "block", marginBottom: "4px" }}>💬 Patient Message</span>
              <div className="v3-body" style={{ fontWeight: 600, fontStyle: "italic", fontSize: "13px" }}>"Mera sugar 110 aur BP 120/80 hai"</div>
            </div>

            {/* Connecting Chevron */}
            <div className="v3-journey-connector-v3">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>

            {/* Step 2: AI Parser node */}
            <div className="v3-journey-card-v3 ai">
              <span className="v3-eyebrow" style={{ color: "var(--v3-brand-purple)", display: "block", marginBottom: "4px" }}>✦ Clinical AI</span>
              <div className="v3-body" style={{ fontWeight: 600, fontSize: "13px" }}>Structuring observations & ranges...</div>
            </div>

            {/* Connecting Chevron */}
            <div className="v3-journey-connector-v3">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>

            {/* Step 3: Record Card */}
            <div className="v3-journey-card-v3 record">
              <span className="v3-eyebrow" style={{ color: "var(--v3-brand-orange)", display: "block", marginBottom: "4px" }}>📊 Digital Record</span>
              <div className="v3-body" style={{ fontWeight: 600, fontSize: "13px" }}>Sugar: 110 mg/dL • BP: 120/80 logged</div>
            </div>

          </div>

        </div>
      </div>

      {/* SECTION 2: LATEST HEALTH SNAPSHOT */}
      <section aria-labelledby="v3-snapshot-heading">
        <h2 id="v3-snapshot-heading" className="v3-section-heading">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--v3-brand-orange)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          Latest Health Snapshot
        </h2>

        <div className="v3-snapshot-grid">
          {[
            { key: "blood_sugar", label: "Blood Sugar", icon: "🩸", fallbackUnit: "mg/dL", class: "blood_sugar" },
            { key: "blood_pressure", label: "Blood Pressure", icon: "🩺", fallbackUnit: "mmHg", class: "blood_pressure" },
            { key: "heart_rate", label: "Heart Rate", icon: "❤️", fallbackUnit: "bpm", class: "heart_rate" },
            { key: "body_temperature", label: "Temperature", icon: "🌡️", fallbackUnit: "°C", class: "body_temperature" },
            { key: "weight", label: "Weight", icon: "⚖️", fallbackUnit: "kg", class: "weight" }
          ].map((param) => {
            const record = getLatestRecord(param.key);

            return (
              <div key={param.key} className={`v3-metric-card ${param.class}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span className="v3-eyebrow">{param.label}</span>
                  <span style={{ fontSize: "18px" }}>{param.icon}</span>
                </div>

                {record ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                      <span className="v3-metric-number">{record.value}</span>
                      <span className="v3-metadata" style={{ fontWeight: 600 }}>{record.unit || param.fallbackUnit}</span>
                    </div>

                    {param.key === "blood_sugar" && record.context && formatGlucoseContext(record.context) && (
                      <span style={{
                        fontSize: "11px",
                        background: "var(--v3-brand-orange-light)",
                        color: "#FFFFFF",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        alignSelf: "flex-start",
                        fontWeight: 600,
                        textTransform: "uppercase"
                      }}>
                        {formatGlucoseContext(record.context)}
                      </span>
                    )}

                    <div className="v3-metadata" style={{ marginTop: "12px", borderTop: "1px solid var(--v3-border-subtle)", paddingTop: "8px" }}>
                      {record.timeContext ? (
                        `${record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1)} · ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(record.recordedAt!))}`
                      ) : (
                        formatRecordDateTime(record.recordedAt)
                      )}
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: "13px", color: "var(--v3-text-muted)", fontStyle: "italic" }}>
                    No readings logged yet
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: TODAY'S HEALTH */}
      <section className="v3-today-box" aria-labelledby="v3-today-heading">
        <div className="v3-today-split">

          {/* Left panel: Timeline Activity */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 id="v3-today-heading" className="v3-section-heading" style={{ margin: 0 }}>
                  🕒 Today's Health
                </h2>
                <p className="v3-metadata" style={{ marginTop: "4px" }}>
                  {formatTodayDateHeader(new Date())} · {todayRecords.length} observation{todayRecords.length !== 1 ? "s" : ""} registered
                </p>
              </div>
            </div>

            {todayRecords.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p className="v3-body" style={{ color: "var(--v3-text-muted)" }}>
                  You haven't recorded any observations today. Simply update us through WhatsApp, or add a record manually.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="whatsapp-info-hint"
                  style={{
                    alignSelf: "flex-start",
                    background: "var(--v3-brand-orange)",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(255, 122, 0, 0.15)"
                  }}
                >
                  📥 Submit Manual Record
                </button>
              </div>
            ) : (
              <div className="v3-today-timeline">
                {todayRecords.map((record, index) => {
                  const displayParam = record.parameter.replace("_", " ").toUpperCase().replace(/\b\w/g, c => c.toUpperCase());
                  const timeStr = formatTimeOnly(record.recordedAt);

                  return (
                    <div
                      key={index}
                      className="v3-today-item today-record-row table-row-hover"
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
                        <span style={{ fontSize: "11px", color: "var(--v3-text-muted)", fontWeight: 600, background: "rgba(107, 100, 93, 0.1)", padding: "2px 8px", borderRadius: "10px" }}>
                          {record.timeContext ? record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1) : timeStr}
                        </span>
                        <strong style={{ fontSize: "14px", color: "var(--v3-text-dark)" }}>
                          {displayParam}
                        </strong>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "15px", color: "var(--v3-text-dark)" }}>
                          {record.value} <span style={{ fontSize: "12px", opacity: 0.6 }}>{record.unit}</span>
                          {record.parameter === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
                            <span style={{
                              fontSize: "10px",
                              background: "#FFF0E0",
                              color: "var(--v3-brand-orange)",
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              marginLeft: "6px"
                            }}>
                              {formatGlucoseContext(record.context)}
                            </span>
                          ) : null}
                        </strong>
                        <span style={{ color: "var(--v3-text-muted)" }}>→</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: WhatsApp Mock bubble (Green cue used carefully) */}
          <div style={{
            background: "var(--v3-bg-cream)",
            border: "1.5px solid var(--v3-border-subtle)",
            borderRadius: "16px",
            padding: "20px"
          }}>
            <span className="v3-eyebrow" style={{ color: "var(--v3-brand-green)", display: "block", marginBottom: "12px" }}>
              🟢 WhatsApp Integration
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{
                background: "var(--v3-brand-green)",
                color: "#FFFFFF",
                padding: "10px 14px",
                borderRadius: "12px 12px 0 12px",
                fontSize: "13px",
                alignSelf: "flex-end",
                maxWidth: "85%",
                fontWeight: 500
              }}>
                Mera sugar level fasting me 110 hai aur BP 120/80 hai
              </div>
              <div style={{
                background: "#FFFFFF",
                color: "var(--v3-text-dark)",
                padding: "10px 14px",
                borderRadius: "12px 12px 12px 0",
                fontSize: "13px",
                alignSelf: "flex-start",
                maxWidth: "85%",
                border: "1px solid var(--v3-border-subtle)",
                fontWeight: 500
              }}>
                Fasting Blood Sugar of 110 mg/dL and Blood Pressure of 120/80 mmHg logged successfully! 🩺🩸
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 4: 30-DAY HEALTH SUMMARY (REBRANDED AS "YOUR HEALTH AT A GLANCE") */}
      <section className="v3-summary-box" aria-labelledby="v3-summary-heading">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h2 id="v3-summary-heading" className="v3-section-heading" style={{ margin: 0 }}>
              Your Health at a Glance
            </h2>
            <p className="v3-metadata" style={{ marginTop: "4px" }}>
              Descriptive longitudinal overview computed directly from your logged parameters.
            </p>
          </div>

          {/* Toggle buttons */}
          <div style={{ background: "var(--v3-bg-cream)", borderRadius: "20px", padding: "4px", display: "inline-flex", border: "1px solid var(--v3-border-subtle)" }}>
            <button
              type="button"
              style={{
                border: "none",
                background: summaryMode === "summary" ? "var(--v3-bg-white)" : "transparent",
                color: summaryMode === "summary" ? "var(--v3-brand-orange)" : "var(--v3-text-muted)",
                fontWeight: 600,
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "16px",
                cursor: "pointer",
                boxShadow: summaryMode === "summary" ? "var(--v3-shadow-sm)" : "none"
              }}
              onClick={() => setSummaryMode("summary")}
            >
              Summary Text
            </button>
            <button
              type="button"
              style={{
                border: "none",
                background: summaryMode === "report" ? "var(--v3-bg-white)" : "transparent",
                color: summaryMode === "report" ? "var(--v3-brand-orange)" : "var(--v3-text-muted)",
                fontWeight: 600,
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "16px",
                cursor: "pointer",
                boxShadow: summaryMode === "report" ? "var(--v3-shadow-sm)" : "none"
              }}
              onClick={() => setSummaryMode("report")}
            >
              Structured Report
            </button>
          </div>
        </div>

        {summaryMode === "summary" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {hasAnyFactualSummaryData ? (
              factualSummaryBlocks.map((block) => {
                const borderColors: Record<string, string> = {
                  blood_sugar: "var(--v3-brand-orange)",
                  blood_pressure: "var(--v3-brand-aqua)",
                  heart_rate: "var(--v3-brand-coral)",
                  body_temperature: "var(--v3-brand-amber)",
                  weight: "var(--v3-brand-purple)"
                };
                const col = borderColors[block.key] || "var(--v3-brand-orange)";

                return (
                  <div
                    key={block.key}
                    style={{
                      background: "#FFFFFF",
                      borderLeft: `4px solid ${col}`,
                      padding: "16px 20px",
                      borderRadius: "12px",
                      borderTop: "1px solid var(--v3-border-subtle)",
                      borderRight: "1px solid var(--v3-border-subtle)",
                      borderBottom: "1px solid var(--v3-border-subtle)",
                      boxShadow: "var(--v3-shadow-sm)"
                    }}
                  >
                    <strong style={{ color: col, display: "block", marginBottom: "4px" }} className="v3-eyebrow">
                      {block.label}
                    </strong>
                    <p style={{ margin: 0, color: "var(--v3-text-dark)", fontSize: "14px", fontStyle: block.hasData ? "normal" : "italic" }}>
                      {block.text}
                    </p>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "32px", textAlign: "center", background: "#FFFFFF", borderRadius: "12px", border: "1px dashed var(--v3-border-subtle)" }}>
                <span style={{ color: "var(--v3-text-muted)", fontStyle: "italic" }}>No parameters logged in the last 30 days.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="v3-summary-grid">
            {factualSummaryBlocks.map((block) => {
              const isClickable = block.hasData;

              return (
                <div
                  key={block.key}
                  onClick={() => isClickable && setSelectedDrilldownBlock(block)}
                  className={`v3-summary-card ${block.key} ${isClickable ? "clickable" : ""}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <strong className="v3-eyebrow">{block.label}</strong>
                    {isClickable && <span className="v3-action-text" style={{ fontSize: "11px" }}>See trend →</span>}
                  </div>

                  {block.hasData && block.metrics ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderBottom: "1px solid var(--v3-border-subtle)", paddingBottom: "4px" }}>
                        <span style={{ color: "var(--v3-text-muted)" }}>Latest:</span>
                        <strong style={{ color: "var(--v3-text-dark)" }}>{block.metrics.latest}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderBottom: "1px solid var(--v3-border-subtle)", paddingBottom: "4px" }}>
                        <span style={{ color: "var(--v3-text-muted)" }}>Average:</span>
                        <strong style={{ color: "var(--v3-text-dark)" }}>{block.metrics.average}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span style={{ color: "var(--v3-text-muted)" }}>Total Logs:</span>
                        <strong style={{ color: "var(--v3-text-dark)" }}>{block.metrics.count} readings</strong>
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: "var(--v3-text-muted)", fontSize: "13px", fontStyle: "italic" }}>
                      No logs registered
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{
          marginTop: "24px",
          padding: "16px 20px",
          background: "#FFFDF5",
          border: "1px solid #FFE58F",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#8C6D15",
          lineHeight: "1.5"
        }}>
          ⚠️ <strong>Factual Clinical Disclaimer:</strong> This summary is automatically computed strictly from recorded patient-reported measurements. It does not diagnose, recommend medication, change treatments, or claim absolute medical certainty.
        </div>
      </section>

      {/* SECTION 5: LAB RESULTS */}
      <section className="v3-lab-box" aria-labelledby="v3-labs-heading">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <span style={{
              background: "#FFF9DB",
              color: "#855B00",
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              padding: "4px 8px",
              borderRadius: "4px",
              display: "inline-block",
              marginBottom: "8px"
            }}>
              🔬 SPECIMEN REPORT CARD
            </span>
            <h2 id="v3-labs-heading" className="v3-section-heading" style={{ margin: 0 }}>
              Lab Results
            </h2>
          </div>

          {onTabChange && (
            <button
              onClick={() => onTabChange("trends")}
              style={{
                background: "none",
                border: "1px solid var(--v3-brand-orange)",
                color: "var(--v3-brand-orange)",
                padding: "8px 16px",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--v3-brand-orange)";
                e.currentTarget.style.color = "#FFFFFF";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "var(--v3-brand-orange)";
              }}
            >
              Explore history →
            </button>
          )}
        </div>

        {isLabsLoading ? (
          <div style={{ padding: "16px", textAlign: "center", color: "var(--v3-text-muted)" }}>
            Loading lab findings...
          </div>
        ) : hasLabsError ? (
          <div style={{ padding: "16px", textAlign: "center", color: "var(--v3-brand-coral)" }}>
            Failed to retrieve laboratory records.
          </div>
        ) : labObservations.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", border: "1px dashed var(--v3-border-subtle)", borderRadius: "8px" }}>
            <span style={{ color: "var(--v3-text-muted)", fontStyle: "italic" }}>No laboratory records found</span>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--v3-border-subtle)", borderRadius: "12px", overflow: "hidden" }}>
            {labObservations.slice(0, 3).map((obs, idx) => {
              const isAbnormal = obs.flag && (obs.flag.toLowerCase() === "high" || obs.flag.toLowerCase() === "low");

              return (
                <div key={idx} className="v3-lab-item-row">
                  <div>
                    <span className="v3-metadata" style={{ fontSize: "11px", display: "block" }}>
                      {new Date(obs.specimenDate || obs.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <strong style={{ fontSize: "15px", color: "var(--v3-text-dark)" }}>
                      {obs.testName}
                    </strong>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <strong style={{ fontSize: "16px", color: "var(--v3-text-dark)" }}>
                      {obs.value} <span style={{ fontSize: "12px", opacity: 0.6, fontWeight: 400 }}>{obs.unit}</span>
                    </strong>
                    {obs.flag && (
                      <span className={`v3-lab-flag-badge ${isAbnormal ? "high" : "normal"}`}>
                        {obs.flag}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 6: CTA GATEWAYS (SIBLINGS) */}
      {onTabChange && (
        <section className="v3-cta-grid">
          <div className="v3-cta-card trends">
            <div>
              <span className="v3-eyebrow" style={{ color: "var(--v3-brand-orange)" }}>Analyze Trends</span>
              <h3 style={{ fontSize: "18px", margin: "8px 0 10px 0", fontWeight: 600 }}>Detailed Trends & History</h3>
              <p className="v3-body" style={{ color: "var(--v3-text-muted)" }}>
                View complete charts and filter historical logs by day, parameter, or category.
              </p>
            </div>
            <button className="v3-cta-btn" onClick={() => onTabChange("trends")}>Explore Trends →</button>
          </div>

          <div className="v3-cta-card insights">
            <div>
              <span className="v3-eyebrow" style={{ color: "var(--v3-brand-purple)" }}>AI Clinical Insights</span>
              <h3 style={{ fontSize: "18px", margin: "8px 0 10px 0", fontWeight: 600 }}>AI Health Insights</h3>
              <p className="v3-body" style={{ color: "var(--v3-text-muted)" }}>
                Get supportive, personalized wellness summaries of your longitudinal records.
              </p>
            </div>
            <button className="v3-cta-btn" onClick={() => onTabChange("ai-insights")}>Open Insights ✦</button>
          </div>
        </section>
      )}

      {/* Drilldown Modal (30 Days Log) */}
      {selectedDrilldownBlock && (
        <div className="modal-backdrop-premium" onClick={() => setSelectedDrilldownBlock(null)} style={{ zIndex: 1000 }}>
          <div className="modal-content-premium modal-content-premium--drilldown" onClick={e => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modal-header-premium" style={{ borderBottom: "1px solid var(--v3-border-subtle)", paddingBottom: "14px", marginBottom: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="modal-icon-premium" style={{ color: "var(--v3-brand-orange)", fontSize: "1.5rem" }}>✦</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h2 className="modal-title-premium" style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600, color: "var(--v3-text-dark)" }}>
                  {selectedDrilldownBlock.label} Log (30 Days)
                </h2>
                <p style={{ margin: "2px 0 0 0", color: "var(--v3-text-muted)", fontSize: "12px", fontWeight: 400 }}>
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
                  return <p style={{ fontStyle: "italic", color: "var(--v3-text-muted)", fontSize: "14px", textAlign: "center", margin: "20px 0" }}>No records found</p>;
                }

                return matchingRecords.map((rec, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "var(--v3-bg-cream)",
                    border: "1px solid var(--v3-border-subtle)",
                    borderRadius: "8px",
                    fontSize: "14px"
                  }}>
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--v3-text-muted)", fontWeight: 600, display: "block" }}>
                        {rec.timeContext ? rec.timeContext.charAt(0).toUpperCase() + rec.timeContext.slice(1) : ""} · {formatRecordDateTime(rec.recordedAt)}
                      </span>
                      {rec.parameter === "blood_sugar" && rec.context && formatGlucoseContext(rec.context) && (
                        <span style={{ fontSize: "12px", color: "var(--v3-brand-orange)", fontWeight: 600 }}>
                          {formatGlucoseContext(rec.context)}
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "16px", color: "var(--v3-text-dark)", fontWeight: 600 }}>
                        {rec.value} <span style={{ fontSize: "12px", opacity: 0.6, fontWeight: 400 }}>{rec.unit}</span>
                      </strong>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="modal-actions-premium" style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid var(--v3-border-subtle)", display: "flex", justifyContent: "flex-end" }}>
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

export default DashboardViewV3;
