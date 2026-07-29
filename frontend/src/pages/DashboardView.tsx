import React, { useState, useEffect } from "react";
import api from "../api/axios";
import PatientProfileCard from "../components/PatientProfileCard";
import ClinicalIntelligencePanel from "../components/ClinicalIntelligencePanel";
import SummaryCard from "../components/SummaryCard";
import TimelineFilter from "../components/TimelineFilter";
import PatientTimeline from "../components/PatientTimeline";
import { type User } from "../App";
import { type PatientOption } from "../components/PatientSelector";
import { type PatientSummaryMap } from "../services/patientService";
import { type TimelineRecord } from "../components/TimelineItem";
import { type TimelineFilterValue } from "../components/TimelineFilter";
import { type ParameterStats } from "../utils/stats";
import { type HealthParameter } from "../hooks/useTrendData";
import { type TabType } from "./Dashboard";
import { formatRecordDateTime, formatGlucoseContext, getLocalDateString } from "../utils/date";

interface DashboardViewProps {
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

const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  effectivePatientId,
  selectedPatientOption,
  summary,
  timeline,
  timelineFilter,
  setTimelineFilter,
  isTimelineLoading,
  isPatientsLoading,
  hasSummaryError,
  hasTimelineError,
  bloodSugarStats,
  bloodPressureStats,
  heartRateStats,
  temperatureStats,
  weightStats,
  selectedParameter,
  setSelectedParameter,
  visibleTimeline,
  setIsModalOpen,
  onTabChange,
  setSelectedHistoryDate,
}) => {
  const [labObservations, setLabObservations] = useState<any[]>([]);
  const [isLabsLoading, setIsLabsLoading] = useState(false);
  const [hasLabsError, setHasLabsError] = useState(false);
  const [summaryMode, setSummaryMode] = useState<"summary" | "report">("summary");

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
          console.error("Error fetching lab observations in DashboardView:", err);
          setHasLabsError(true);
        })
        .finally(() => {
          setIsLabsLoading(false);
        });
    }
  }, [effectivePatientId]);

  // 1. Factual Health Summary calculation for Last 30 Days (for patients)
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
          text: `Last 30 Days: ${records.length} BP readings recorded. Average: ${avgSys}/${avgDia} mmHg. Range: ${minSys}/${minDia} to ${maxSys}/${maxDia} mmHg. Latest: ${latestVal} mmHg.`,
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
        text: `Last 30 Days: ${records.length} ${p.label.toLowerCase()} readings recorded. Average: ${avgVal} ${p.unit}. Range: ${minVal}–${maxVal} ${p.unit}. Latest: ${latestVal} ${p.unit}.`,
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

  const snapshotParameters = [
    { key: "blood_sugar", label: "Blood Sugar", icon: "🩸", fallbackUnit: "mg/dL" },
    { key: "blood_pressure", label: "Blood Pressure", icon: "🩺", fallbackUnit: "mmHg" },
    { key: "heart_rate", label: "Heart Rate", icon: "❤️", fallbackUnit: "bpm" },
    { key: "body_temperature", label: "Temperature", icon: "🌡️", fallbackUnit: "°C" },
    { key: "weight", label: "Weight", icon: "⚖️", fallbackUnit: "kg" }
  ];

  if (user.role === "patient") {
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
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* Patient Greeting & Identity Header */}
        <div className="patient-welcome-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "24px", marginBottom: "8px", gap: "20px", flexWrap: "wrap" }}>
          <div className="patient-welcome-section__info" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <h1 className="patient-welcome-section__title" style={{ margin: 0, color: "var(--color-text-primary)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 600, letterSpacing: "-0.03em" }}>
              Welcome, {user.fullName || user.username}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
              <span className="sidebar__role-context" style={{ margin: 0 }}>
                Patient Space
              </span>
              <p className="patient-welcome-section__id" style={{ margin: 0, fontSize: "0.88rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>
                Patient ID: {user.patientId || user.username}
              </p>
            </div>
            <p className="patient-welcome-section__subtitle" style={{ margin: "6px 0 0 0", color: "var(--color-text-secondary)", fontSize: "0.9rem", fontWeight: 400 }}>
              Your personal health snapshot and longitudinal record.
            </p>
          </div>
          <div
            className="whatsapp-info-hint"
            onClick={() => setIsModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "var(--color-success-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "12px 18px",
              color: "var(--color-brand-primary)",
              fontSize: "0.85rem",
              fontWeight: 500,
              maxWidth: "420px",
              lineHeight: "1.4",
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)"
            }}
            title="Click to manually submit a record"
          >
            <span style={{ fontSize: "1.1rem" }}>💬</span>
            <span>Health updates are automatically organized from your connected WhatsApp submissions.</span>
          </div>
        </div>

        {/* Latest Health Snapshot Grid */}
        <section aria-labelledby="latest-snapshot-title">
          <h2 id="latest-snapshot-title" style={{ margin: "0 0 16px 0", color: "var(--color-text-primary)", fontSize: "1.15rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
            Latest Health Snapshot
          </h2>
          <div className="summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {snapshotParameters.map((param) => {
              const record = getLatestRecord(param.key);
              return (
                <div
                  key={param.key}
                  style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    boxShadow: "var(--shadow-sm)",
                    opacity: record ? 1 : 0.8
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      {param.label}
                    </span>
                    <span style={{ fontSize: "1.2rem" }}>{param.icon}</span>
                  </div>
                  {record ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                      <strong style={{ fontSize: "1.25rem", color: "var(--color-text-primary)", fontWeight: 600 }}>
                        {record.value} <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>{record.unit || param.fallbackUnit}</span>
                        {param.key === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
                          <span style={{ fontSize: "0.85rem", color: "var(--color-brand-primary)", fontWeight: 500 }}> · {formatGlucoseContext(record.context)}</span>
                        ) : null}
                      </strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--color-text-tertiary)", fontWeight: 400 }}>
                        {record.timeContext ? (
                          `${record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1)} · ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(record.recordedAt!))}`
                        ) : (
                          formatRecordDateTime(record.recordedAt)
                        )}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.85rem", color: "var(--color-text-tertiary)", fontStyle: "italic", fontWeight: 400, marginTop: "8px" }}>
                      No data available
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Today's Health Section */}
        <section aria-labelledby="todays-health-title" style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 id="todays-health-title" style={{ margin: 0, color: "var(--color-text-primary)", fontSize: "1.15rem", fontWeight: 600 }}>
                Today's Health
              </h2>
              <p style={{ margin: "2px 0 0 0", color: "var(--color-text-secondary)", fontSize: "0.82rem", fontWeight: 400 }}>
                {formatTodayDateHeader(new Date())} · {todayRecords.length} record{todayRecords.length !== 1 ? "s" : ""}
              </p>
            </div>
            {onTabChange && (
              <button
                onClick={() => {
                  if (setSelectedHistoryDate) {
                    setSelectedHistoryDate(getLocalDateString(new Date()));
                  }
                  onTabChange("trends");
                }}
                className="view-history-link"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-brand-primary)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  padding: 0,
                  transition: "color 0.15s ease"
                }}
              >
                View today's records →
              </button>
            )}
          </div>

          {todayRecords.length === 0 ? (
            <p style={{ margin: 0, color: "var(--color-text-tertiary)", fontStyle: "italic", fontSize: "0.88rem" }}>
              No health records logged today.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {todayRecords.map((record, index) => {
                const displayParam = record.parameter.replace("_", " ").toUpperCase().replace(/\b\w/g, c => c.toUpperCase());
                const timeStr = formatTimeOnly(record.recordedAt);
                return (
                  <div
                    key={index}
                    onClick={() => {
                      if (setSelectedHistoryDate) {
                        setSelectedHistoryDate(getLocalDateString(record.recordedAt));
                      }
                      if (onTabChange) {
                        onTabChange("trends");
                      }
                    }}
                    style={{
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                    className="table-row-hover today-record-row"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", fontWeight: 500, minWidth: "70px" }}>
                        {record.timeContext ? record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1) : timeStr}
                      </span>
                      <strong style={{ fontSize: "0.92rem", color: "var(--color-text-primary)", fontWeight: 600 }}>
                        {displayParam}
                      </strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "1.05rem", color: "var(--color-text-primary)", fontWeight: 600 }}>
                        {record.value} <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 400 }}>{record.unit}</span>
                        {record.parameter === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
                          <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 400, marginLeft: "4px" }}>
                            · {formatGlucoseContext(record.context)}
                          </span>
                        ) : null}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 30-Day Health Summary with Switchable Modes */}
        <section aria-labelledby="factual-summary-title" style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <h3 id="factual-summary-title" style={{ margin: 0, color: "var(--color-text-primary)", fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
              📊 30-Day Health Summary
            </h3>
            <div style={{
              display: "flex",
              background: "var(--color-border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "2px"
            }}>
              <button
                type="button"
                onClick={() => setSummaryMode("summary")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: summaryMode === "summary" ? "var(--color-bg-card)" : "transparent",
                  color: summaryMode === "summary" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow: summaryMode === "summary" ? "var(--shadow-sm)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                Summary View
              </button>
              <button
                type="button"
                onClick={() => setSummaryMode("report")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: summaryMode === "report" ? "var(--color-bg-card)" : "transparent",
                  color: summaryMode === "report" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow: summaryMode === "report" ? "var(--shadow-sm)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                Structured Report
              </button>
            </div>
          </div>

          {summaryMode === "summary" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.88rem" }}>
              {hasAnyFactualSummaryData ? (
                factualSummaryBlocks.map((block) => (
                  <div key={block.key} style={{ paddingBottom: "10px", borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <strong style={{ color: "var(--color-brand-primary)", textTransform: "uppercase", fontSize: "0.7rem", display: "block", marginBottom: "3px", letterSpacing: "0.03em" }}>
                      {block.label}
                    </strong>
                    <p style={{ margin: 0, color: "var(--color-text-primary)", fontWeight: 400, fontStyle: block.hasData ? "normal" : "italic" }}>
                      {block.text}
                    </p>
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, color: "var(--color-text-tertiary)", fontStyle: "italic" }}>
                  Insufficient data to formulate a factual summary for the last 30 days.
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              {factualSummaryBlocks.map((block) => (
                <div
                  key={block.key}
                  style={{
                    background: "var(--color-canvas)",
                    borderRadius: "var(--radius-md)",
                    padding: "16px",
                    border: "1px solid var(--color-border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px"
                  }}
                >
                  <strong style={{ color: "var(--color-brand-primary)", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                    {block.label}
                  </strong>
                  {block.hasData && block.metrics ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                        <span style={{ color: "var(--color-text-secondary)" }}>Latest:</span>
                        <strong style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{block.metrics.latest}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                        <span style={{ color: "var(--color-text-secondary)" }}>Average:</span>
                        <strong style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{block.metrics.average}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                        <span style={{ color: "var(--color-text-secondary)" }}>Range:</span>
                        <strong style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{block.metrics.range}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                        <span style={{ color: "var(--color-text-secondary)" }}>Total Logs:</span>
                        <strong style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{block.metrics.count}</strong>
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: "4px 0 0 0", color: "var(--color-text-tertiary)", fontStyle: "italic", fontSize: "0.82rem" }}>
                      No data recorded
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "18px", padding: "12px", background: "var(--color-error-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "0.74rem", color: "var(--color-error)", fontWeight: 500, lineHeight: "1.5" }}>
            ⚠️ Factual Clinical Disclaimer: This summary is automatically derived strictly from recorded patient-reported values. It is descriptive and factual only. It does not diagnose disease, recommend medication, change treatment, claim medical certainty, or make clinical decisions. Any clinical adjustments must be made by the licensed practitioner.
          </div>
        </section>

        {/* Your Lab Results Section */}
        <section aria-labelledby="lab-results-title" style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 id="lab-results-title" style={{ margin: 0, color: "var(--color-text-primary)", fontSize: "1.15rem", fontWeight: 600 }}>
                🧪 Your Lab Results
              </h2>
              <p style={{ margin: "2px 0 0 0", color: "var(--color-text-secondary)", fontSize: "0.82rem", fontWeight: 400 }}>
                Laboratory findings and observations extracted from your shared reports.
              </p>
            </div>
            {onTabChange && (
              <button
                onClick={() => onTabChange("trends")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-brand-primary)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  padding: 0,
                  transition: "color 0.15s ease"
                }}
              >
                View all results →
              </button>
            )}
          </div>

          {isLabsLoading ? (
            <div style={{ padding: "20px", color: "var(--color-text-tertiary)", fontStyle: "italic", fontSize: "0.88rem" }}>
              Loading lab results...
            </div>
          ) : hasLabsError ? (
            <div style={{ padding: "20px", border: "1px dashed var(--color-error)", borderRadius: "var(--radius-md)", color: "var(--color-error)", fontSize: "0.88rem", fontWeight: 500 }}>
              Failed to retrieve laboratory records. Please check your connection and try again.
            </div>
          ) : labObservations.length === 0 ? (
            <div style={{ padding: "20px", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-tertiary)", fontStyle: "italic", fontSize: "0.88rem" }}>
              No laboratory records found. Send a report via WhatsApp to see observations here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {labObservations.slice(0, 2).map((obs, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "var(--color-canvas)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 500,
                  fontSize: "0.88rem"
                }}>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "var(--color-text-tertiary)", fontWeight: 500, display: "block" }}>
                      {new Date(obs.specimenDate || obs.createdAt).toLocaleDateString()}
                    </span>
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontSize: "0.95rem" }}>
                      {obs.testName}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "1.05rem", color: "var(--color-text-primary)", fontWeight: 600 }}>
                      {obs.value} <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", fontWeight: 400 }}>{obs.unit}</span>
                    </strong>
                    {obs.flag && (
                      <span style={{
                        display: "block",
                        marginTop: "2px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        color: obs.flag.toLowerCase() === "high" || obs.flag.toLowerCase() === "low" ? "var(--color-error)" : "var(--color-brand-primary)"
                      }}>
                        [{obs.flag}]
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions / Navigation */}
        {onTabChange && (
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "8px" }}>
            <button
              onClick={() => onTabChange("trends")}
              className="btn-add-record"
              style={{
                background: "var(--color-brand-primary)",
                boxShadow: "var(--shadow-sm)",
                flex: 1,
                justifyContent: "center",
                padding: "12px 20px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.88rem",
                fontWeight: 600
              }}
            >
              📈 Detailed Trends & History
            </button>
            <button
              onClick={() => onTabChange("ai-insights")}
              className="btn-add-record"
              style={{
                background: "var(--color-text-primary)",
                boxShadow: "var(--shadow-sm)",
                flex: 1,
                justifyContent: "center",
                padding: "12px 20px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.88rem",
                fontWeight: 600
              }}
            >
              ✦ AI Clinical Insights
            </button>
          </div>
        )}
      </div>
    );
  }

  // Fallback / standard doctor and admin view
  return (
    <>
      <section className="summary-section" aria-labelledby="patient-summary-title">
        <div className="summary-section__top-row">
          <div>
            <p className="summary-section__eyebrow">Patient overview</p>
            <h2 className="summary-section__heading" id="patient-summary-title">
              Patient workspace & vital statistics
            </h2>
          </div>
        </div>
        <p className="summary-section__description">A clinical overview of the selected patient&apos;s records and vital trends.</p>

        <PatientProfileCard
          patientId={effectivePatientId}
          latestRecordedAt={selectedPatientOption?.latestRecordedAt}
          totalRecords={selectedPatientOption?.totalRecords ?? 0}
          isLoading={isPatientsLoading}
        />

        <ClinicalIntelligencePanel
          summary={summary}
          isLoading={isTimelineLoading || isPatientsLoading}
        />

        {hasSummaryError ? (
          <div className="dashboard__state-card dashboard__state-card--embedded">
            <h1>Patient summary unavailable</h1>
            <p>Please check the connection and try again.</p>
          </div>
        ) : !summary ? (
          <div className="summary-grid">
            <div className="summary-card--loading" />
            <div className="summary-card--loading" />
            <div className="summary-card--loading" />
            <div className="summary-card--loading" />
            <div className="summary-card--loading" />
          </div>
        ) : (
          <div className="summary-grid">
            <SummaryCard
              accent="blue"
              icon="◒"
              label="Blood Sugar"
              stats={bloodSugarStats}
              isSelected={selectedParameter === "blood_sugar"}
              onClick={() => setSelectedParameter("blood_sugar")}
            />
            <SummaryCard
              accent="rose"
              icon="♥"
              label="Blood Pressure"
              stats={bloodPressureStats}
              isSelected={selectedParameter === "blood_pressure"}
              onClick={() => setSelectedParameter("blood_pressure")}
            />
            <SummaryCard
              accent="violet"
              icon="⌁"
              label="Heart Rate"
              stats={heartRateStats}
              isSelected={selectedParameter === "heart_rate"}
              onClick={() => setSelectedParameter("heart_rate")}
            />
            <SummaryCard
              accent="orange"
              icon="°"
              label="Temperature"
              stats={temperatureStats}
              isSelected={selectedParameter === "body_temperature"}
              onClick={() => setSelectedParameter("body_temperature")}
            />
            <SummaryCard
              accent="teal"
              icon="◈"
              label="Weight"
              stats={weightStats}
              isSelected={selectedParameter === "weight"}
              onClick={() => setSelectedParameter("weight")}
            />
          </div>
        )}
      </section>

      <div className="timeline-filter-section">
        <TimelineFilter onChange={setTimelineFilter} value={timelineFilter} />
      </div>

      <PatientTimeline
        emptyMessage={timeline.length > 0 ? "No health records match the selected filter." : undefined}
        hasError={hasTimelineError}
        isLoading={isTimelineLoading}
        records={visibleTimeline}
      />
    </>
  );
};

export default DashboardView;
