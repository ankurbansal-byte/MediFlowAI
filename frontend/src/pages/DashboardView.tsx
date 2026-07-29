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
        {/* Patient Greeting & Identity Header (Premium High-Impact Hero) */}
        <div
          className="patient-welcome-section-hero"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(135deg, #0F172A 0%, #4338CA 100%)",
            borderRadius: "var(--radius-lg)",
            padding: "32px 36px",
            marginBottom: "12px",
            gap: "24px",
            flexWrap: "wrap",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 16px -6px rgba(15, 23, 42, 0.1)",
            color: "#FFFFFF"
          }}
        >
          <div className="patient-welcome-section__info" style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 450px" }}>
            <h1 className="patient-welcome-section__title" style={{ margin: 0, color: "#FFFFFF", fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", fontWeight: 600, letterSpacing: "-0.03em" }}>
              Welcome, {user.fullName || user.username}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px", flexWrap: "wrap" }}>
              <span
                className="sidebar__role-context"
                style={{
                  margin: 0,
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "#F8FAFC",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  letterSpacing: "0.05em",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
              >
                Patient Space
              </span>
              <p className="patient-welcome-section__id" style={{ margin: 0, fontSize: "0.9rem", fontWeight: 500, color: "#E2E8F0" }}>
                Patient ID: <span style={{ fontFamily: "monospace", letterSpacing: "0.03em" }}>{user.patientId || user.username}</span>
              </p>
            </div>
            <p className="patient-welcome-section__subtitle" style={{ margin: "8px 0 0 0", color: "#CBD5E1", fontSize: "0.95rem", fontWeight: 400, lineHeight: "1.5" }}>
              Your personal health snapshot, secure longitudinal record, and clinical insights — updated continuously.
            </p>
          </div>

          <div
            className="whatsapp-info-hint"
            onClick={() => setIsModalOpen(true)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              background: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderLeft: "4px solid #25D366",
              borderRadius: "var(--radius-md)",
              padding: "16px 20px",
              color: "#F8FAFC",
              fontSize: "0.88rem",
              fontWeight: 500,
              maxWidth: "420px",
              lineHeight: "1.45",
              cursor: "pointer",
              boxShadow: "var(--shadow-md)",
              transition: "transform 0.15s ease, border-color 0.15s ease"
            }}
            title="Click to manually submit a record"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#25D366", boxShadow: "0 0 8px #25D366" }} />
              <strong style={{ color: "#25D366", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.06em", fontWeight: 600 }}>
                💬 WhatsApp Sync Active
              </strong>
            </div>
            <span>Your health updates from WhatsApp are automatically organized by MediFlowAI.</span>
          </div>
        </div>

        {/* Latest Health Snapshot Grid */}
        <section aria-labelledby="latest-snapshot-title" style={{ marginTop: "8px", marginBottom: "8px" }}>
          <h2 id="latest-snapshot-title" style={{ margin: "0 0 20px 0", color: "var(--color-text-primary)", fontSize: "1.3rem", fontWeight: 600, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.45rem" }}>⚡</span> Latest Health Snapshot
          </h2>
          <div className="summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            {snapshotParameters.map((param) => {
              const record = getLatestRecord(param.key);

              // Custom vibrant accent styling mapping
              const designAccents: Record<string, { main: string; bg: string; border: string }> = {
                blood_sugar: { main: "#F97316", bg: "#FFF7ED", border: "#FED7AA" }, // Orange
                blood_pressure: { main: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" }, // Royal Blue
                heart_rate: { main: "#E11D48", bg: "#FFF1F2", border: "#FECDD3" }, // Rose
                body_temperature: { main: "#D97706", bg: "#FEF3C7", border: "#FDE68A" }, // Amber/Yellow
                weight: { main: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" } // Purple
              };
              const accent = designAccents[param.key] || { main: "#0F766E", bg: "#E6F4F1", border: "#CCFBF1" };

              return (
                <div
                  key={param.key}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--color-border)",
                    borderTop: `4px solid ${accent.main}`,
                    borderRadius: "var(--radius-md)",
                    padding: "20px 22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.05)",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    opacity: record ? 1 : 0.85,
                    cursor: record ? "pointer" : "default"
                  }}
                  onMouseEnter={(e) => {
                    if (record) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "var(--shadow-md)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (record) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.05)";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {param.label}
                    </span>
                    <span style={{
                      fontSize: "1.2rem",
                      background: accent.bg,
                      color: accent.main,
                      padding: "6px",
                      borderRadius: "var(--radius-sm)",
                      display: "grid",
                      placeItems: "center"
                    }}>
                      {param.icon}
                    </span>
                  </div>
                  {record ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "2px" }}>
                      <strong style={{ fontSize: "1.45rem", color: "var(--color-text-primary)", fontWeight: 600, letterSpacing: "-0.02em" }}>
                        {record.value} <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>{record.unit || param.fallbackUnit}</span>
                        {param.key === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
                          <span style={{
                            fontSize: "0.78rem",
                            background: accent.bg,
                            color: accent.main,
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            marginLeft: "6px",
                            verticalAlign: "middle"
                          }}>
                            {formatGlucoseContext(record.context)}
                          </span>
                        ) : null}
                      </strong>
                      <span style={{ fontSize: "0.74rem", color: "var(--color-text-tertiary)", fontWeight: 400, marginTop: "2px" }}>
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
          background: "#F0F4F8",
          border: "1px solid #CBD5E1",
          borderLeft: "5px solid #2563EB",
          borderRadius: "var(--radius-lg)",
          padding: "24px 28px",
          boxShadow: "0 4px 15px rgba(15, 23, 42, 0.05)",
          marginTop: "12px",
          marginBottom: "12px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 id="todays-health-title" style={{ margin: 0, color: "var(--color-text-primary)", fontSize: "1.25rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#2563EB" }}>🕒</span> Today's Health
              </h2>
              <p style={{ margin: "4px 0 0 0", color: "var(--color-text-secondary)", fontSize: "0.85rem", fontWeight: 500 }}>
                {formatTodayDateHeader(new Date())} · {todayRecords.length} record{todayRecords.length !== 1 ? "s" : ""} recorded today
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
                  color: "#2563EB",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  transition: "color 0.15s ease, background-color 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#1D4ED8";
                  e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#2563EB";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                View today's records →
              </button>
            )}
          </div>

          {todayRecords.length === 0 ? (
            <div style={{ background: "#FFFFFF", border: "1px dashed #CBD5E1", borderRadius: "var(--radius-md)", padding: "20px", textAlign: "center" }}>
              <p style={{ margin: 0, color: "var(--color-text-tertiary)", fontStyle: "italic", fontSize: "0.9rem" }}>
                No health records logged today. Share your vitals on WhatsApp to automatically sync!
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {todayRecords.map((record, index) => {
                const displayParam = record.parameter.replace("_", " ").toUpperCase().replace(/\b\w/g, c => c.toUpperCase());
                const timeStr = formatTimeOnly(record.recordedAt);

                // Color map to give the today card items minor accents
                const todayAccents: Record<string, string> = {
                  blood_sugar: "#F97316",
                  blood_pressure: "#2563EB",
                  heart_rate: "#E11D48",
                  body_temperature: "#D97706",
                  weight: "#7C3AED"
                };
                const paramAccentColor = todayAccents[record.parameter] || "#2563EB";

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
                      transition: "all 0.15s ease",
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderLeft: `4px solid ${paramAccentColor}`,
                      borderRadius: "var(--radius-md)",
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)"
                    }}
                    className="table-row-hover today-record-row"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateX(2px)";
                      e.currentTarget.style.boxShadow = "0 4px 8px rgba(15, 23, 42, 0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateX(0)";
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(15, 23, 42, 0.02)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", fontWeight: 600, background: "#F1F5F9", padding: "4px 10px", borderRadius: "20px", minWidth: "70px", textAlign: "center" }}>
                        {record.timeContext ? record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1) : timeStr}
                      </span>
                      <strong style={{ fontSize: "0.95rem", color: "var(--color-text-primary)", fontWeight: 600 }}>
                        {displayParam}
                      </strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "1.1rem", color: "var(--color-text-primary)", fontWeight: 600 }}>
                        {record.value} <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", fontWeight: 400 }}>{record.unit}</span>
                        {record.parameter === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
                          <span style={{
                            fontSize: "0.78rem",
                            background: "rgba(249, 115, 22, 0.1)",
                            color: "#F97316",
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            marginLeft: "6px"
                          }}>
                            {formatGlucoseContext(record.context)}
                          </span>
                        ) : null}
                      </strong>
                      <span style={{ color: "var(--color-text-tertiary)", fontSize: "0.9rem", marginLeft: "4px" }}>→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 30-Day Health Summary with Switchable Modes (Premium Dark Section Treatment) */}
        <section aria-labelledby="factual-summary-title" style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          border: "1px solid #1E293B",
          borderRadius: "var(--radius-lg)",
          padding: "28px 32px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.2), 0 8px 16px -6px rgba(15, 23, 42, 0.15)",
          color: "#FFFFFF",
          marginTop: "12px",
          marginBottom: "12px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h3 id="factual-summary-title" style={{ margin: 0, color: "#FFFFFF", fontSize: "1.3rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }}>
                <span>📊</span> 30-Day Health Summary
              </h3>
              <p style={{ margin: "4px 0 0 0", color: "#94A3B8", fontSize: "0.88rem", fontWeight: 400 }}>
                This is your organized 30-day health intelligence.
              </p>
            </div>
            <div style={{
              display: "flex",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "var(--radius-sm)",
              padding: "3px",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
              <button
                type="button"
                onClick={() => setSummaryMode("summary")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: summaryMode === "summary" ? "#FFFFFF" : "transparent",
                  color: summaryMode === "summary" ? "#0F172A" : "#94A3B8",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  boxShadow: summaryMode === "summary" ? "0 2px 4px rgba(15, 23, 42, 0.1)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                Summary
              </button>
              <button
                type="button"
                onClick={() => setSummaryMode("report")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: summaryMode === "report" ? "#FFFFFF" : "transparent",
                  color: summaryMode === "report" ? "#0F172A" : "#94A3B8",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  boxShadow: summaryMode === "report" ? "0 2px 4px rgba(15, 23, 42, 0.1)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                Health Report
              </button>
            </div>
          </div>

          {summaryMode === "summary" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.88rem" }}>
              {hasAnyFactualSummaryData ? (
                factualSummaryBlocks.map((block) => {
                  const designAccents: Record<string, { main: string; bg: string }> = {
                    blood_sugar: { main: "#F97316", bg: "#FFF7ED" },
                    blood_pressure: { main: "#2563EB", bg: "#EFF6FF" },
                    heart_rate: { main: "#E11D48", bg: "#FFF1F2" },
                    body_temperature: { main: "#D97706", bg: "#FEF3C7" },
                    weight: { main: "#7C3AED", bg: "#F5F3FF" }
                  };
                  const colors = designAccents[block.key] || { main: "#0F766E", bg: "#E6F4F1" };

                  return (
                    <div
                      key={block.key}
                      style={{
                        background: "#FFFFFF",
                        borderLeft: `4px solid ${colors.main}`,
                        padding: "16px 20px",
                        borderRadius: "var(--radius-md)",
                        boxShadow: "0 4px 6px rgba(15, 23, 42, 0.05)"
                      }}
                    >
                      <strong style={{ color: colors.main, textTransform: "uppercase", fontSize: "0.75rem", display: "block", marginBottom: "6px", letterSpacing: "0.04em", fontWeight: 600 }}>
                        {block.label}
                      </strong>
                      <p style={{ margin: 0, color: "#1E293B", fontWeight: 400, fontSize: "0.9rem", lineHeight: "1.45", fontStyle: block.hasData ? "normal" : "italic" }}>
                        {block.text}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px dashed rgba(255, 255, 255, 0.15)", borderRadius: "var(--radius-md)", padding: "24px", textAlign: "center" }}>
                  <p style={{ margin: 0, color: "#94A3B8", fontStyle: "italic" }}>
                    Insufficient data to formulate a factual summary for the last 30 days.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              {factualSummaryBlocks.map((block) => {
                const isClickable = block.hasData;
                const designAccents: Record<string, { main: string; bg: string }> = {
                  blood_sugar: { main: "#F97316", bg: "#FFF7ED" },
                  blood_pressure: { main: "#2563EB", bg: "#EFF6FF" },
                  heart_rate: { main: "#E11D48", bg: "#FFF1F2" },
                  body_temperature: { main: "#D97706", bg: "#FEF3C7" },
                  weight: { main: "#7C3AED", bg: "#F5F3FF" }
                };
                const colors = designAccents[block.key] || { main: "#0F766E", bg: "#E6F4F1" };

                return (
                  <div
                    key={block.key}
                    onClick={() => {
                      if (isClickable) {
                        setSelectedDrilldownBlock(block);
                      }
                    }}
                    className={isClickable ? "clickable-report-card" : ""}
                    style={{
                      background: "#FFFFFF",
                      borderRadius: "var(--radius-md)",
                      padding: "18px 20px",
                      border: "1px solid #E2E8F0",
                      borderLeft: `4px solid ${colors.main}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      cursor: isClickable ? "pointer" : "default",
                      transition: "all 0.15s ease",
                      boxShadow: "0 4px 6px rgba(15, 23, 42, 0.05)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <strong style={{ color: colors.main, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.04em", fontWeight: 600 }}>
                        {block.label}
                      </strong>
                      {isClickable && (
                        <span style={{ fontSize: "0.65rem", color: "var(--color-text-tertiary)", fontWeight: 500 }}>(View log)</span>
                      )}
                    </div>
                    {block.hasData && block.metrics ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", borderBottom: "1px solid #F1F5F9", paddingBottom: "4px" }}>
                          <span style={{ color: "var(--color-text-secondary)" }}>Latest:</span>
                          <strong style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{block.metrics.latest}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", borderBottom: "1px solid #F1F5F9", paddingBottom: "4px" }}>
                          <span style={{ color: "var(--color-text-secondary)" }}>Average:</span>
                          <strong style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{block.metrics.average}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", borderBottom: "1px solid #F1F5F9", paddingBottom: "4px" }}>
                          <span style={{ color: "var(--color-text-secondary)" }}>Range:</span>
                          <strong style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{block.metrics.range}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
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
                );
              })}
            </div>
          )}

          <div style={{
            marginTop: "24px",
            padding: "16px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.78rem",
            color: "#CBD5E1",
            fontWeight: 500,
            lineHeight: "1.5"
          }}>
            ⚠️ <strong style={{ color: "#FCA5A5" }}>Factual Clinical Disclaimer:</strong> This summary is automatically derived strictly from recorded patient-reported values. It is descriptive and factual only. It does not diagnose disease, recommend medication, change treatment, claim medical certainty, or make clinical decisions. Any clinical adjustments must be made by the licensed practitioner.
          </div>
        </section>

        {/* Your Lab Results Section */}
        <section aria-labelledby="lab-results-title" style={{
          background: "#F5F3FF", // Confident, visible Lavender/Purple surface
          border: "1px solid #DDD6FE",
          borderLeft: "5px solid #7C3AED", // Distinct left border accent
          borderRadius: "var(--radius-lg)",
          padding: "24px 28px",
          boxShadow: "0 4px 15px rgba(124, 58, 237, 0.05)",
          marginTop: "12px",
          marginBottom: "12px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 id="lab-results-title" style={{ margin: 0, color: "var(--color-text-primary)", fontSize: "1.25rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#7C3AED" }}>🧪</span> Your Lab Results
              </h2>
              <p style={{ margin: "4px 0 0 0", color: "var(--color-text-secondary)", fontSize: "0.85rem", fontWeight: 400 }}>
                Laboratory findings and observations extracted from your shared reports.
              </p>
            </div>
            {onTabChange && (
              <button
                onClick={() => onTabChange("trends")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#7C3AED",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  transition: "color 0.15s ease, background-color 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#6D28D9";
                  e.currentTarget.style.backgroundColor = "rgba(124, 58, 237, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#7C3AED";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                View all results →
              </button>
            )}
          </div>

          {isLabsLoading ? (
            <div style={{ padding: "20px", color: "var(--color-text-tertiary)", fontStyle: "italic", fontSize: "0.88rem", textAlign: "center" }}>
              Loading lab results...
            </div>
          ) : hasLabsError ? (
            <div style={{ padding: "20px", border: "1px dashed var(--color-error)", borderRadius: "var(--radius-md)", color: "var(--color-error)", fontSize: "0.88rem", fontWeight: 500, textAlign: "center" }}>
              Failed to retrieve laboratory records. Please check your connection and try again.
            </div>
          ) : labObservations.length === 0 ? (
            <div style={{ background: "#FFFFFF", border: "1px dashed #DDD6FE", borderRadius: "var(--radius-md)", padding: "24px", textAlign: "center" }}>
              <p style={{ margin: 0, color: "var(--color-text-tertiary)", fontStyle: "italic", fontSize: "0.9rem" }}>
                No laboratory records found. Send a report via WhatsApp to see observations here.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {labObservations.slice(0, 2).map((obs, idx) => {
                const isAbnormal = obs.flag && (obs.flag.toLowerCase() === "high" || obs.flag.toLowerCase() === "low");
                return (
                  <div key={idx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    background: "#FFFFFF",
                    border: "1px solid #EDE9FE",
                    borderRadius: "var(--radius-md)",
                    fontWeight: 500,
                    fontSize: "0.88rem",
                    boxShadow: "0 2px 4px rgba(124, 58, 237, 0.02)",
                    transition: "transform 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                  >
                    <div>
                      <span style={{ fontSize: "0.74rem", color: "var(--color-text-tertiary)", fontWeight: 600, display: "block", marginBottom: "3px" }}>
                        📅 Specimen Date: {new Date(obs.specimenDate || obs.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontSize: "1rem" }}>
                        {obs.testName}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "1.15rem", color: "var(--color-text-primary)", fontWeight: 600 }}>
                        {obs.value} <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 400 }}>{obs.unit}</span>
                      </strong>
                      {obs.flag && (
                        <span style={{
                          display: "inline-block",
                          marginLeft: "8px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: isAbnormal ? "var(--color-error-bg)" : "rgba(124, 58, 237, 0.1)",
                          color: isAbnormal ? "var(--color-error)" : "#7C3AED",
                          verticalAlign: "middle"
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

        {/* Quick Actions / Navigation (Premium Feature Gateways) */}
        {onTabChange && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
            marginTop: "16px",
            marginBottom: "12px"
          }}>
            {/* Card 1: Detailed Trends */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #BFDBFE",
                borderLeft: "5px solid #2563EB",
                borderRadius: "var(--radius-lg)",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
                boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.05)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 10px 20px rgba(37, 99, 235, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(37, 99, 235, 0.05)";
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{
                    fontSize: "1.2rem",
                    background: "#EFF6FF",
                    color: "#2563EB",
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center"
                  }}>
                    📈
                  </span>
                  <strong style={{ fontSize: "1.1rem", color: "var(--color-text-primary)", fontWeight: 600 }}>
                    Detailed Trends & History
                  </strong>
                </div>
                <p style={{ margin: "4px 0 0 0", color: "var(--color-text-secondary)", fontSize: "0.85rem", lineHeight: "1.5" }}>
                  Analyze your clinical records over time. Explore fully interactive charts, filter metrics by day, and track historical logs with absolute precision.
                </p>
              </div>
              <button
                onClick={() => onTabChange("trends")}
                style={{
                  background: "#2563EB",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 2px 4px rgba(37, 99, 235, 0.15)",
                  transition: "background-color 0.15s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#1D4ED8"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#2563EB"}
              >
                Explore Analytics →
              </button>
            </div>

            {/* Card 2: AI Health Insights */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #DDD6FE",
                borderLeft: "5px solid #7C3AED",
                borderRadius: "var(--radius-lg)",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
                boxShadow: "0 4px 6px -1px rgba(124, 58, 237, 0.05)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 10px 20px rgba(124, 58, 237, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(124, 58, 237, 0.05)";
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{
                    fontSize: "1.2rem",
                    background: "#F5F3FF",
                    color: "#7C3AED",
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center"
                  }}>
                    ✦
                  </span>
                  <strong style={{ fontSize: "1.1rem", color: "var(--color-text-primary)", fontWeight: 600 }}>
                    AI Health Insights
                  </strong>
                </div>
                <p style={{ margin: "4px 0 0 0", color: "var(--color-text-secondary)", fontSize: "0.85rem", lineHeight: "1.5" }}>
                  Formulate health summaries and smart guidance powered by MediFlowAI, cross-referencing routine readings with laboratory report observations.
                </p>
              </div>
              <button
                onClick={() => onTabChange("ai-insights")}
                style={{
                  background: "#7C3AED",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 2px 4px rgba(124, 58, 237, 0.15)",
                  transition: "background-color 0.15s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#6D28D9"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#7C3AED"}
              >
                View AI Insights ✦
              </button>
            </div>
          </div>
        )}

        {selectedDrilldownBlock && (
          <div className="modal-backdrop-premium" onClick={() => setSelectedDrilldownBlock(null)} style={{ zIndex: 1000 }}>
            <div className="modal-content-premium modal-content-premium--drilldown" onClick={e => e.stopPropagation()} style={{ maxWidth: "500px" }}>
              <div className="modal-header-premium" style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "14px", marginBottom: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
                <span className="modal-icon-premium" style={{ color: "var(--color-brand-primary)", fontSize: "1.5rem" }}>✦</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <h2 className="modal-title-premium" style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {selectedDrilldownBlock.label} Log (30 Days)
                  </h2>
                  <p style={{ margin: "2px 0 0 0", color: "var(--color-text-secondary)", fontSize: "0.8rem", fontWeight: 400 }}>
                    Chronological history of your registered readings
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
                    return <p style={{ fontStyle: "italic", color: "var(--color-text-tertiary)", fontSize: "0.85rem", textAlign: "center", margin: "20px 0" }}>No records found</p>;
                  }

                  return matchingRecords.map((rec, idx) => (
                    <div key={idx} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      background: "var(--color-canvas)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.88rem"
                    }}>
                      <div>
                        <span style={{ fontSize: "0.72rem", color: "var(--color-text-tertiary)", fontWeight: 500, display: "block" }}>
                          {rec.timeContext ? rec.timeContext.charAt(0).toUpperCase() + rec.timeContext.slice(1) : ""} · {formatRecordDateTime(rec.recordedAt)}
                        </span>
                        {rec.parameter === "blood_sugar" && rec.context && formatGlucoseContext(rec.context) && (
                          <span style={{ fontSize: "0.75rem", color: "var(--color-brand-primary)", fontWeight: 500 }}>
                            {formatGlucoseContext(rec.context)}
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <strong style={{ fontSize: "1rem", color: "var(--color-text-primary)", fontWeight: 600 }}>
                          {rec.value} <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 400 }}>{rec.unit}</span>
                        </strong>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="modal-actions-premium" style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn-premium btn-premium--secondary"
                  onClick={() => setSelectedDrilldownBlock(null)}
                  type="button"
                  style={{ padding: "6px 16px", fontSize: "0.85rem" }}
                >
                  Close
                </button>
              </div>
            </div>
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
