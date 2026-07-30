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
import "./DashboardV2.css";

interface DashboardViewV2Props {
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

const DashboardViewV2: React.FC<DashboardViewV2Props> = ({
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
          console.error("Error fetching lab observations in DashboardViewV2:", err);
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
    <div className="dashboard--v2" style={{ display: "flex", flexDirection: "column", gap: "32px", padding: "16px 0" }}>

      {/* SECTION 1: REAL HOME HERO */}
      <div className="v2-hero mediflow-pattern">
        <div className="v2-hero__content">
          <div className="v2-hero__left">
            <span className="v2-hero__badge">⚡ MediFlowAI Home V2</span>
            <h1 className="v2-hero-title">
              Hello, {user.fullName || user.username}
            </h1>
            <p className="v2-supporting-copy" style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "16px", margin: "4px 0" }}>
              Securely synchronized with your WhatsApp, bringing clinician-grade precision to your daily wellness tracking.
            </p>
            <div className="v2-micro-label" style={{ color: "var(--v2-sky-blue)", fontWeight: 700, marginTop: "8px" }}>
              Patient ID: {user.patientId || user.username}
            </div>
          </div>

          <div className="v2-hero__right">
            <div className="v2-flowchart">
              <span className="v2-micro-label" style={{ color: "#FFFFFF", opacity: 0.6, alignSelf: "center", marginBottom: "4px" }}>
                WhatsApp Connection Flow
              </span>

              <div className="v2-flowchart__step">
                <div className="v2-flowchart__icon-wrapper v2-flowchart__icon-whatsapp">💬</div>
                <div className="v2-flowchart__text">
                  <span className="v2-flowchart__title">Send Message</span>
                  <span className="v2-flowchart__desc">"Mera BP 120/80 hai"</span>
                </div>
              </div>

              <div className="v2-flowchart__arrow">↓</div>

              <div className="v2-flowchart__step">
                <div className="v2-flowchart__icon-wrapper v2-flowchart__icon-ai">✦</div>
                <div className="v2-flowchart__text">
                  <span className="v2-flowchart__title">AI Extraction</span>
                  <span className="v2-flowchart__desc">Extracts & parses measurements</span>
                </div>
              </div>

              <div className="v2-flowchart__arrow">↓</div>

              <div className="v2-flowchart__step">
                <div className="v2-flowchart__icon-wrapper v2-flowchart__icon-record">📊</div>
                <div className="v2-flowchart__text">
                  <span className="v2-flowchart__title">Structured Record</span>
                  <span className="v2-flowchart__desc">Instantly cataloged securely</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: LATEST HEALTH SNAPSHOT */}
      <section aria-labelledby="v2-snapshot-heading">
        <h2 id="v2-snapshot-heading" className="v2-section-heading" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span>⚡</span> Latest Health Snapshot
        </h2>

        <div className="v2-snapshot-grid">
          {[
            { key: "blood_sugar", label: "Blood Sugar", icon: "🩸", fallbackUnit: "mg/dL", class: "v2-metric-card--sugar" },
            { key: "blood_pressure", label: "Blood Pressure", icon: "🩺", fallbackUnit: "mmHg", class: "v2-metric-card--bp" },
            { key: "heart_rate", label: "Heart Rate", icon: "❤️", fallbackUnit: "bpm", class: "v2-metric-card--heart" },
            { key: "body_temperature", label: "Temperature", icon: "🌡️", fallbackUnit: "°C", class: "v2-metric-card--temp" },
            { key: "weight", label: "Weight", icon: "⚖️", fallbackUnit: "kg", class: "v2-metric-card--weight" }
          ].map((param) => {
            const record = getLatestRecord(param.key);

            return (
              <div key={param.key} className={`v2-metric-card ${param.class}`}>
                <div className="v2-metric-card__header-band" />
                <div className="v2-metric-card__body">
                  <div className="v2-metric-card__top">
                    <span className="v2-micro-label v2-metric-card__title">{param.label}</span>
                    <div className="v2-metric-card__icon-disc">{param.icon}</div>
                  </div>

                  {record ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div className="v2-metric-card__value-zone">
                        <span className="v2-primary-value v2-metric-card__value">{record.value}</span>
                        <span className="v2-metric-card__unit">{record.unit || param.fallbackUnit}</span>
                      </div>

                      {param.key === "blood_sugar" && record.context && formatGlucoseContext(record.context) && (
                        <span className="v2-metric-card__pill">{formatGlucoseContext(record.context)}</span>
                      )}

                      <div className="v2-metric-card__meta">
                        {record.timeContext ? (
                          `${record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1)} · ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(record.recordedAt!))}`
                        ) : (
                          formatRecordDateTime(record.recordedAt)
                        )}
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: "14px", color: "var(--v2-deep-navy)", opacity: 0.4, fontStyle: "italic", marginTop: "12px" }}>
                      No records logged
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: TODAY'S HEALTH */}
      <section className="v2-today-health" aria-labelledby="v2-today-heading">
        <div className="v2-today-health__header">
          <div>
            <h2 id="v2-today-heading" className="v2-section-heading" style={{ margin: 0 }}>
              🕒 Today's Health
            </h2>
            <p className="v2-supporting-copy" style={{ color: "var(--v2-deep-navy)", opacity: 0.6, marginTop: "4px" }}>
              {formatTodayDateHeader(new Date())} · {todayRecords.length} observation{todayRecords.length !== 1 ? "s" : ""} registered today
            </p>
          </div>

          <div className="v2-today-health__badge">
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--v2-whatsapp-green)" }} />
            WhatsApp Connected
          </div>
        </div>

        {todayRecords.length === 0 ? (
          <div className="v2-today-health__empty-state">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--v2-deep-navy)" }}>
                Share your health update on WhatsApp
              </h3>
              <p className="v2-supporting-copy" style={{ color: "var(--v2-deep-navy)", opacity: 0.7, margin: 0 }}>
                Send simple, natural language messages about your vitals on WhatsApp, and MediFlowAI organizes them instantly for you here.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="whatsapp-info-hint"
                style={{
                  alignSelf: "flex-start",
                  background: "var(--v2-whatsapp-green)",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(37, 211, 102, 0.2)",
                  transition: "transform 0.2s ease"
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                📥 Add Manual Record
              </button>
            </div>

            <div className="v2-today-health__bubble-visual">
              <span className="v2-micro-label" style={{ opacity: 0.5 }}>Simulated Workspace Integration</span>
              <div className="v2-today-health__bubble-msg">
                Mera sugar level fasting me 110 hai aur BP 120/80 hai
              </div>
              <div className="v2-today-health__bubble-reply">
                Fasting Blood Sugar of 110 mg/dL and Blood Pressure of 120/80 mmHg logged successfully! 🩺🩸
              </div>
            </div>
          </div>
        ) : (
          <div className="v2-today-health__records-grid">
            {todayRecords.map((record, index) => {
              const displayParam = record.parameter.replace("_", " ").toUpperCase().replace(/\b\w/g, c => c.toUpperCase());
              const timeStr = formatTimeOnly(record.recordedAt);

              const colorsMap: Record<string, string> = {
                blood_sugar: "var(--v2-vivid-orange)",
                blood_pressure: "var(--v2-electric-blue)",
                heart_rate: "var(--v2-coral-rose)",
                body_temperature: "var(--v2-warm-yellow)",
                weight: "var(--v2-royal-purple)"
              };
              const accentColor = colorsMap[record.parameter] || "var(--v2-electric-blue)";

              return (
                <div
                  key={index}
                  className="v2-today-record-row today-record-row table-row-hover"
                  style={{ borderLeft: `5px solid ${accentColor}` }}
                  onClick={() => {
                    if (setSelectedHistoryDate) {
                      setSelectedHistoryDate(getLocalDateString(record.recordedAt));
                    }
                    if (onTabChange) {
                      onTabChange("trends");
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span style={{ fontSize: "12px", color: "var(--v2-deep-navy)", opacity: 0.6, fontWeight: 700, background: "rgba(16, 27, 54, 0.05)", padding: "4px 10px", borderRadius: "99px" }}>
                      {record.timeContext ? record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1) : timeStr}
                    </span>
                    <strong style={{ fontSize: "16px", color: "var(--v2-deep-navy)" }}>
                      {displayParam}
                    </strong>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <strong style={{ fontSize: "18px", color: "var(--v2-deep-navy)", fontWeight: 800 }}>
                      {record.value} <span style={{ fontSize: "13px", opacity: 0.6, fontWeight: 500 }}>{record.unit}</span>
                      {record.parameter === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
                        <span style={{
                          fontSize: "11px",
                          background: "rgba(255, 122, 0, 0.1)",
                          color: "var(--v2-vivid-orange)",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "4px",
                          marginLeft: "8px",
                          verticalAlign: "middle"
                        }}>
                          {formatGlucoseContext(record.context)}
                        </span>
                      ) : null}
                    </strong>
                    <span style={{ color: "var(--v2-deep-navy)", opacity: 0.4 }}>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 4: 30-DAY HEALTH SUMMARY */}
      <section className="v2-intel-section" aria-labelledby="v2-intel-heading">
        <div className="v2-intel-header">
          <div>
            <h2 id="v2-intel-heading" className="v2-intel-title" style={{ fontSize: "24px", fontWeight: 700 }}>
              🧠 30-Day Factual Health Summary
            </h2>
            <p className="v2-supporting-copy" style={{ color: "#cbd5e1", marginTop: "4px" }}>
              Descriptive longitudinal overview computed directly from your logged parameters.
            </p>
          </div>

          <div className="v2-intel-controls">
            <button
              type="button"
              className={`v2-intel-btn ${summaryMode === "summary" ? "v2-intel-btn--active" : ""}`}
              onClick={() => setSummaryMode("summary")}
            >
              Summary
            </button>
            <button
              type="button"
              className={`v2-intel-btn ${summaryMode === "report" ? "v2-intel-btn--active" : ""}`}
              onClick={() => setSummaryMode("report")}
            >
              Health Report
            </button>
          </div>
        </div>

        {summaryMode === "summary" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {hasAnyFactualSummaryData ? (
              factualSummaryBlocks.map((block) => {
                const colorsMap: Record<string, string> = {
                  blood_sugar: "var(--v2-vivid-orange)",
                  blood_pressure: "var(--v2-electric-blue)",
                  heart_rate: "var(--v2-coral-rose)",
                  body_temperature: "var(--v2-warm-yellow)",
                  weight: "var(--v2-royal-purple)"
                };
                const col = colorsMap[block.key] || "var(--v2-electric-blue)";

                return (
                  <div
                    key={block.key}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      borderLeft: `4px solid ${col}`,
                      padding: "20px 24px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderLeftWidth: "4px"
                    }}
                  >
                    <strong style={{ color: col, display: "block", marginBottom: "6px" }} className="v2-micro-label">
                      {block.label}
                    </strong>
                    <p style={{ margin: 0, color: "#f8fafc", fontSize: "14px", lineHeight: "1.5", fontStyle: block.hasData ? "normal" : "italic" }}>
                      {block.text}
                    </p>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "32px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No parameters logged in the last 30 days.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="v2-intel-cards-container">
            {factualSummaryBlocks.map((block) => {
              const isClickable = block.hasData;
              const colorsMap: Record<string, string> = {
                blood_sugar: "var(--v2-vivid-orange)",
                blood_pressure: "var(--v2-electric-blue)",
                heart_rate: "var(--v2-coral-rose)",
                body_temperature: "var(--v2-warm-yellow)",
                weight: "var(--v2-royal-purple)"
              };
              const col = colorsMap[block.key] || "var(--v2-electric-blue)";

              return (
                <div
                  key={block.key}
                  onClick={() => isClickable && setSelectedDrilldownBlock(block)}
                  className={`v2-intel-card ${isClickable ? "clickable-report-card" : ""}`}
                  style={{
                    borderLeft: `4px solid ${col}`,
                    cursor: isClickable ? "pointer" : "default"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong className="v2-micro-label" style={{ color: col }}>{block.label}</strong>
                    {isClickable && <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>(Log View)</span>}
                  </div>

                  {block.hasData && block.metrics ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                      <div className="v2-intel-card__metric-line">
                        <span>Latest:</span>
                        <strong>{block.metrics.latest}</strong>
                      </div>
                      <div className="v2-intel-card__metric-line">
                        <span>Average:</span>
                        <strong>{block.metrics.average}</strong>
                      </div>
                      <div className="v2-intel-card__metric-line">
                        <span>Range:</span>
                        <strong>{block.metrics.range}</strong>
                      </div>
                      <div className="v2-intel-card__metric-line" style={{ borderBottom: "none", paddingBottom: 0 }}>
                        <span>Total Logs:</span>
                        <strong>{block.metrics.count}</strong>
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", fontStyle: "italic", marginTop: "12px" }}>
                      No logs registered
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{
          marginTop: "32px",
          padding: "20px",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          fontSize: "12px",
          color: "#cbd5e1",
          lineHeight: "1.5"
        }}>
          ⚠️ <strong style={{ color: "#fca5a5" }}>Factual Clinical Disclaimer:</strong> This summary is automatically derived strictly from recorded patient-reported values. It is descriptive and factual only. It does not diagnose disease, recommend medication, change treatment, claim medical certainty, or make clinical decisions. Any clinical adjustments must be made by the licensed practitioner.
        </div>
      </section>

      {/* SECTION 5: LAB RESULTS */}
      <section className="v2-labs" aria-labelledby="v2-labs-heading">
        <span className="v2-labs__badge-band">🧪 SPECIMEN FINDINGS LAB V2</span>

        <div className="v2-labs-header">
          <div>
            <h2 id="v2-labs-heading" className="v2-section-heading" style={{ margin: 0 }}>
              Your Lab Results
            </h2>
            <p className="v2-supporting-copy" style={{ color: "var(--v2-deep-navy)", opacity: 0.6, marginTop: "4px" }}>
              Laboratory parameters securely parsed from physical test documents.
            </p>
          </div>

          {onTabChange && (
            <button
              onClick={() => onTabChange("trends")}
              style={{
                background: "rgba(109, 40, 217, 0.08)",
                color: "var(--v2-royal-purple)",
                border: "none",
                padding: "10px 20px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                transition: "background 0.2s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(109, 40, 217, 0.15)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(109, 40, 217, 0.08)"}
            >
              View All Observations →
            </button>
          )}
        </div>

        {isLabsLoading ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--v2-deep-navy)", opacity: 0.5, fontStyle: "italic" }}>
            Loading lab findings...
          </div>
        ) : hasLabsError ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--v2-coral-rose)", fontWeight: 600 }}>
            Failed to retrieve laboratory records.
          </div>
        ) : labObservations.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", border: "1px dashed rgba(16,27,54,0.1)", borderRadius: "12px" }}>
            <span style={{ color: "var(--v2-deep-navy)", opacity: 0.4, fontStyle: "italic" }}>No laboratory results parsed yet.</span>
          </div>
        ) : (
          <div className="v2-labs-container">
            {labObservations.slice(0, 3).map((obs, idx) => {
              const isAbnormal = obs.flag && (obs.flag.toLowerCase() === "high" || obs.flag.toLowerCase() === "low");

              return (
                <div key={idx} className="v2-lab-item">
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span className="v2-micro-label" style={{ opacity: 0.5 }}>
                      Date: {new Date(obs.specimenDate || obs.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <strong style={{ fontSize: "18px", color: "var(--v2-deep-navy)", fontWeight: 700 }}>
                      {obs.testName}
                    </strong>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <strong style={{ fontSize: "20px", color: "var(--v2-deep-navy)", fontWeight: 800 }}>
                      {obs.value} <span style={{ fontSize: "14px", opacity: 0.6, fontWeight: 500 }}>{obs.unit}</span>
                    </strong>
                    {obs.flag && (
                      <span className={isAbnormal ? "v2-lab-item__badge-abnormal" : ""} style={{
                        padding: "4px 10px",
                        borderRadius: "4px",
                        background: isAbnormal ? "rgba(244, 63, 94, 0.1)" : "rgba(37,99,235,0.08)",
                        color: isAbnormal ? "var(--v2-coral-rose)" : "var(--v2-electric-blue)",
                        fontWeight: 700,
                        fontSize: "12px",
                        textTransform: "uppercase"
                      }}>
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

      {/* SECTION 6: CTA GATEWAYS */}
      {onTabChange && (
        <section className="v2-ctas">
          <div className="v2-cta-card v2-cta-card--trends">
            <div className="v2-cta-card__top">
              <div className="v2-cta-card__icon">📈</div>
              <h3 className="v2-cta-card__title">Detailed Trends & History</h3>
              <p className="v2-cta-card__desc">
                Dive deep into historical observations with interactive charts, date-grouped navigation filters, and clinical trends.
              </p>
            </div>
            <button
              type="button"
              className="v2-cta-card__btn"
              onClick={() => onTabChange("trends")}
            >
              Explore Trends →
            </button>
          </div>

          <div className="v2-cta-card v2-cta-card--insights">
            <div className="v2-cta-card__top">
              <div className="v2-cta-card__icon">✦</div>
              <h3 className="v2-cta-card__title">AI Health Insights</h3>
              <p className="v2-cta-card__desc">
                Access personalized clinical insights and supportive analytics powered securely by MediFlowAI.
              </p>
            </div>
            <button
              type="button"
              className="v2-cta-card__btn"
              onClick={() => onTabChange("ai-insights")}
            >
              Open Insights ✦
            </button>
          </div>
        </section>
      )}

      {/* Drilldown Modal */}
      {selectedDrilldownBlock && (
        <div className="modal-backdrop-premium" onClick={() => setSelectedDrilldownBlock(null)} style={{ zIndex: 1000 }}>
          <div className="modal-content-premium modal-content-premium--drilldown" onClick={e => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modal-header-premium" style={{ borderBottom: "1px solid var(--v2-deep-navy)", paddingBottom: "14px", marginBottom: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="modal-icon-premium" style={{ color: "var(--v2-electric-blue)", fontSize: "1.5rem" }}>✦</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h2 className="modal-title-premium" style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600, color: "var(--v2-deep-navy)" }}>
                  {selectedDrilldownBlock.label} Log (30 Days)
                </h2>
                <p style={{ margin: "2px 0 0 0", color: "var(--v2-deep-navy)", opacity: 0.6, fontSize: "12px", fontWeight: 400 }}>
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
                  return <p style={{ fontStyle: "italic", color: "rgba(16,27,54,0.4)", fontSize: "14px", textAlign: "center", margin: "20px 0" }}>No records found</p>;
                }

                return matchingRecords.map((rec, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "var(--v2-off-white)",
                    border: "1px solid rgba(16,27,54,0.05)",
                    borderRadius: "8px",
                    fontSize: "14px"
                  }}>
                    <div>
                      <span style={{ fontSize: "11px", color: "rgba(16,27,54,0.5)", fontWeight: 600, display: "block" }}>
                        {rec.timeContext ? rec.timeContext.charAt(0).toUpperCase() + rec.timeContext.slice(1) : ""} · {formatRecordDateTime(rec.recordedAt)}
                      </span>
                      {rec.parameter === "blood_sugar" && rec.context && formatGlucoseContext(rec.context) && (
                        <span style={{ fontSize: "12px", color: "var(--v2-vivid-orange)", fontWeight: 600 }}>
                          {formatGlucoseContext(rec.context)}
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "16px", color: "var(--v2-deep-navy)", fontWeight: 700 }}>
                        {rec.value} <span style={{ fontSize: "12px", opacity: 0.6, fontWeight: 400 }}>{rec.unit}</span>
                      </strong>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="modal-actions-premium" style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid rgba(16,27,54,0.1)", display: "flex", justifyContent: "flex-end" }}>
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

export default DashboardViewV2;
