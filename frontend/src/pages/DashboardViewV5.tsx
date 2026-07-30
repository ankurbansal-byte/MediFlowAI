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
import "./DashboardV5.css";

const EditorialTransition: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="v5-editorial-transition">
      <div className="v5-editorial-divider">
        <div className="v5-editorial-line"></div>
        <span className="v5-editorial-icon">✦</span>
        <span className="v5-editorial-badge">INSIGHT</span>
        <span className="v5-editorial-icon">✦</span>
        <div className="v5-editorial-line"></div>
      </div>
      <p className="v5-editorial-text">
        {text}
      </p>
    </div>
  );
};

interface DashboardViewV5Props {
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

const DashboardViewV5: React.FC<DashboardViewV5Props> = ({
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
          console.error("Error fetching lab observations in DashboardViewV5:", err);
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
    <div className="dashboard--v5 v5-mediflow-pattern" style={{ display: "flex", flexDirection: "column", gap: "32px", padding: "16px 24px" }}>

      {/* SECTION 1: HERO SECTION - EVOLVED VISUAL JOURNEY */}
      <div className="v5-hero-wrapper">
        <div className="v5-hero">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "32px", alignItems: "center" }}>

            {/* Left Side: Welcoming Content */}
            <div className="v5-hero-left">
              <span style={{
                background: "var(--v5-brand-green-light)",
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
                ⚡ MediFlowAI Home V5
              </span>
              <h1 className="v5-display" style={{ margin: "0 0 12px 0", fontSize: "32px" }}>
                Welcome back, {user.fullName || user.username}
              </h1>
              <p className="v5-body" style={{ color: "var(--v5-text-muted)", fontSize: "15px", margin: "0 0 20px 0", maxWidth: "440px" }}>
                Effortlessly track your vital metrics in real-time. Just send a simple text or voice message on WhatsApp, and our medical intelligence parser organizes it for you instantly.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--v5-brand-green)", fontWeight: 600, fontSize: "14px" }}>
                  <span style={{ fontSize: "16px" }}>💬</span>
                  <span>“Just message it. MediFlowAI organizes the rest.”</span>
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "var(--v5-brand-orange)", fontWeight: 600, background: "#FFF0E0", padding: "6px 14px", borderRadius: "6px", alignSelf: "flex-start" }}>
                ID: {user.patientId || user.username}
              </div>
            </div>

            {/* Right Side: Spacious Vertical Flowchart Visual Journey */}
            <div className="v5-journey-visual">

              {/* Step 1: WhatsApp Message Experience Card */}
              <div className="v5-journey-card-v5 whatsapp" style={{ padding: "16px", borderRadius: "12px", border: "1.5px solid var(--v5-border-subtle)", background: "var(--v5-bg-white)", borderLeft: "4px solid var(--v5-brand-green)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "var(--v5-brand-green-light)",
                    color: "var(--v5-brand-green)"
                  }}>
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.011 2c-5.502 0-9.989 4.487-9.989 9.989 0 1.761.458 3.473 1.332 4.98L2 22l5.187-1.359c1.464.799 3.11 1.22 4.814 1.22 5.504 0 9.991-4.487 9.991-9.989A9.99 9.99 0 0012.011 2zm6.208 14.154c-.255.718-1.5 1.318-2.059 1.404-.499.077-1.154.144-3.328-.756-2.78-1.15-4.57-3.988-4.71-4.174-.139-.186-1.139-1.514-1.139-2.89 0-1.376.719-2.053.974-2.333.255-.279.558-.349.743-.349H9.3c.186 0 .442-.07.697.54.256.61.872 2.129.948 2.284.075.155.126.335.021.543-.103.208-.155.335-.308.513-.153.178-.322.396-.46.531-.155.15-.318.314-.136.626.182.312.809 1.331 1.734 2.157.925.826 1.707 1.08 2.025 1.213.318.133.504.111.693-.106.189-.217.809-.942 1.025-1.264.217-.322.433-.269.73-.159.297.109 1.886.889 2.213 1.053.328.164.546.244.626.382.081.138.081.802-.174 1.52z"/>
                    </svg>
                  </span>
                  <span className="v5-eyebrow" style={{ color: "var(--v5-brand-green)", fontWeight: 600 }}>WhatsApp Message</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{
                    background: "#DCF8C6",
                    color: "#1E1C1A",
                    padding: "10px 14px",
                    borderRadius: "12px 12px 12px 0",
                    fontSize: "13px",
                    lineHeight: "1.4",
                    alignSelf: "flex-start",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    position: "relative",
                    maxWidth: "95%"
                  }}>
                    <div style={{ fontWeight: 500, fontStyle: "italic" }}>
                      "Mera sugar level fasting me 110 aur BP 120/80 hai"
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "4px", marginTop: "4px", fontSize: "10px", color: "#6B645D" }}>
                      <span>08:15 AM</span>
                      <span style={{ color: "#34B7F1", display: "inline-flex" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M0.41 13.417l2.83-2.83 5.66 5.66L20.17 5L23 7.83l-14.1 14.1z" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vertical Connector 1 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "-6px 0", zIndex: 10 }}>
                <div style={{ width: "2px", height: "18px", background: "linear-gradient(to bottom, var(--v5-brand-green), var(--v5-brand-purple))" }}></div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", borderRadius: "50%", background: "var(--v5-bg-cream)", border: "1.5px solid var(--v5-brand-purple)", color: "var(--v5-brand-purple)", fontSize: "10px", fontWeight: "bold", lineHeight: 1 }}>↓</div>
              </div>

              {/* Step 2: AI Parser node */}
              <div className="v5-journey-card-v5 ai" style={{ padding: "16px", borderRadius: "12px", border: "1.5px solid var(--v5-border-subtle)", background: "var(--v5-bg-white)", borderLeft: "4px solid var(--v5-brand-purple)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "var(--v5-brand-purple-light)",
                    color: "var(--v5-brand-purple)"
                  }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0-12V3m0 6h-6m6 0h6m-3 6a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <span className="v5-eyebrow" style={{ color: "var(--v5-brand-purple)", fontWeight: 600 }}>MediFlowAI Processing</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(124, 58, 237, 0.03)", padding: "10px 14px", borderRadius: "8px", border: "1px dashed rgba(124, 58, 237, 0.2)" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ position: "relative", display: "flex", width: "10px", height: "10px" }}>
                      <span style={{ position: "absolute", height: "100%", width: "100%", borderRadius: "50%", backgroundColor: "var(--v5-brand-purple)", opacity: 0.75, transform: "scale(1.5)" }}></span>
                      <span style={{ position: "relative", borderRadius: "50%", height: "10px", width: "10px", backgroundColor: "var(--v5-brand-purple)" }}></span>
                    </span>
                    <svg width="16" height="16" fill="currentColor" style={{ color: "var(--v5-brand-purple)" }} viewBox="0 0 24 24">
                      <path d="M12 2l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />
                    </svg>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--v5-text-dark)" }}>Multilingual Clinical Extraction</span>
                    <span style={{ fontSize: "11px", color: "var(--v5-text-muted)" }}>Parsing context: `fasting` • Normalizing units...</span>
                  </div>
                </div>
              </div>

              {/* Vertical Connector 2 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "-6px 0", zIndex: 10 }}>
                <div style={{ width: "2px", height: "18px", background: "linear-gradient(to bottom, var(--v5-brand-purple), var(--v5-brand-orange))" }}></div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", borderRadius: "50%", background: "var(--v5-bg-cream)", border: "1.5px solid var(--v5-brand-orange)", color: "var(--v5-brand-orange)", fontSize: "10px", fontWeight: "bold", lineHeight: 1 }}>↓</div>
              </div>

              {/* Step 3: Record Card */}
              <div className="v5-journey-card-v5 record" style={{ padding: "16px", borderRadius: "12px", border: "1.5px solid var(--v5-border-subtle)", background: "var(--v5-bg-white)", borderLeft: "4px solid var(--v5-brand-orange)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "#FFF0E0",
                    color: "var(--v5-brand-orange)"
                  }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  <span className="v5-eyebrow" style={{ color: "var(--v5-brand-orange)", fontWeight: 600 }}>Structured Health Record</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ background: "#FFF9F2", border: "1px solid #FFE5CC", padding: "8px 12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "10px", color: "var(--v5-brand-orange)", fontWeight: 600, textTransform: "uppercase" }}>Blood Sugar</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                      <strong style={{ fontSize: "16px", color: "var(--v5-text-dark)" }}>110</strong>
                      <span style={{ fontSize: "10px", color: "var(--v5-text-muted)" }}>mg/dL</span>
                    </div>
                    <span style={{ fontSize: "9px", background: "rgba(255,122,0,0.1)", color: "var(--v5-brand-orange)", padding: "1px 4px", borderRadius: "3px", fontWeight: 600 }}>Fasting</span>
                  </div>

                  <div style={{ background: "#F0F9FF", border: "1px solid #B0E0E6", padding: "8px 12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "10px", color: "var(--v5-brand-aqua)", fontWeight: 600, textTransform: "uppercase" }}>Blood Pressure</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                      <strong style={{ fontSize: "16px", color: "var(--v5-text-dark)" }}>120/80</strong>
                      <span style={{ fontSize: "10px", color: "var(--v5-text-muted)" }}>mmHg</span>
                    </div>
                    <span style={{ fontSize: "9px", background: "rgba(14,165,233,0.1)", color: "var(--v5-brand-aqua)", padding: "1px 4px", borderRadius: "3px", fontWeight: 600 }}>Normal</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>

      <EditorialTransition text="“One simple message today can become meaningful health history tomorrow.”" />

      {/* SECTION 2: LATEST HEALTH SNAPSHOT */}
      <section aria-labelledby="v5-snapshot-heading">
        <h2 id="v5-snapshot-heading" className="v5-section-heading">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: "var(--v5-brand-orange)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          Latest Health Snapshot
        </h2>

        <div className="v5-snapshot-grid">
          {[
            { key: "blood_sugar", label: "Blood Sugar", icon: "🩸", fallbackUnit: "mg/dL", class: "blood_sugar", iconBg: "#FFF0E0", iconBorder: "#FFE5CC", tint: "#FFFBF7", tab: "trends" as TabType },
            { key: "blood_pressure", label: "Blood Pressure", icon: "🩺", fallbackUnit: "mmHg", class: "blood_pressure", iconBg: "#E0F2FE", iconBorder: "#BAE6FD", tint: "#F0F9FF", tab: "trends" as TabType },
            { key: "heart_rate", label: "Heart Rate", icon: "❤️", fallbackUnit: "bpm", class: "heart_rate", iconBg: "#FFE4E6", iconBorder: "#FECDD3", tint: "#FFF5F5", tab: "trends" as TabType },
            { key: "body_temperature", label: "Temperature", icon: "🌡️", fallbackUnit: "°C", class: "body_temperature", iconBg: "#FEF9C3", iconBorder: "#FEF08A", tint: "#FFFDF0", tab: "trends" as TabType },
            { key: "weight", label: "Weight", icon: "⚖️", fallbackUnit: "kg", class: "weight", iconBg: "#F3E8FF", iconBorder: "#E9D5FF", tint: "#FAF5FF", tab: "trends" as TabType }
          ].map((param) => {
            const record = getLatestRecord(param.key);

            return (
              <div
                key={param.key}
                className={`v5-metric-card ${param.class} clickable-record-card`}
                style={{ background: param.tint, position: "relative", overflow: "hidden" }}
                onClick={() => {
                  if (onTabChange) onTabChange(param.tab);
                }}
              >

                {/* Low-opacity large emoji background motif */}
                <div style={{ position: "absolute", bottom: "-10px", right: "-10px", fontSize: "72px", opacity: 0.05, pointerEvents: "none", userSelect: "none", zIndex: 0 }}>
                  {param.icon}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", position: "relative", zIndex: 1 }}>
                  <span className="v5-eyebrow">{param.label}</span>
                  {/* Refined Circle Icon Container */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: param.iconBg,
                    border: `1.5px solid ${param.iconBorder}`,
                    fontSize: "18px"
                  }}>
                    {param.icon}
                  </div>
                </div>

                {record ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                      <span className="v5-metric-number">{record.value}</span>
                      <span className="v5-metadata" style={{ fontWeight: 600 }}>{record.unit || param.fallbackUnit}</span>
                    </div>

                    {param.key === "blood_sugar" && record.context && formatGlucoseContext(record.context) && (
                      <span style={{
                        fontSize: "11px",
                        background: "var(--v5-brand-orange-light)",
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

                    <div className="v5-metadata" style={{ marginTop: "12px", borderTop: "1px solid var(--v5-border-subtle)", paddingTop: "8px" }}>
                      {record.timeContext ? (
                        `${record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1)} · ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(record.recordedAt!))}`
                      ) : (
                        formatRecordDateTime(record.recordedAt)
                      )}
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: "13px", color: "var(--v5-text-muted)", fontStyle: "italic", position: "relative", zIndex: 1 }}>
                    No readings logged yet
                  </span>
                )}

                {/* Affordance / Button to clearly communicate clickability */}
                <div className="v5-card-affordance" style={{ marginTop: "16px", borderTop: "1px solid var(--v5-border-subtle)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--v5-text-muted)" }}>View Details</span>
                  <button className="v5-card-pill-btn">See trend →</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <EditorialTransition text="“Small daily updates build a clearer picture of your health.”" />

      {/* SECTION 3: TODAY'S HEALTH */}
      <section className="v5-today-box" aria-labelledby="v5-today-heading">
        <div className="v5-today-split">

          {/* Left panel: Timeline Activity */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
              <div>
                <h2 id="v5-today-heading" className="v5-section-heading" style={{ margin: 0 }}>
                  🕒 Today's Health
                </h2>
                <p className="v5-metadata" style={{ marginTop: "4px" }}>
                  {formatTodayDateHeader(new Date())} · {todayRecords.length} observation{todayRecords.length !== 1 ? "s" : ""} registered
                </p>
              </div>

              {/* Secondary manual record action */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="whatsapp-info-hint"
                style={{
                  background: "none",
                  border: "1.5px solid var(--v5-border-subtle)",
                  color: "var(--v5-text-muted)",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "var(--v5-brand-orange)";
                  e.currentTarget.style.color = "var(--v5-brand-orange)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--v5-border-subtle)";
                  e.currentTarget.style.color = "var(--v5-text-muted)";
                }}
              >
                + Manual Entry
              </button>
            </div>

            {todayRecords.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(16, 185, 129, 0.02)", padding: "20px", borderRadius: "12px", border: "1px dashed var(--v5-border-subtle)" }}>
                <p className="v5-body" style={{ color: "var(--v5-text-muted)", margin: 0, fontStyle: "italic" }}>
                  No observations logged yet today. Update your vitals instantly by sending a message on WhatsApp!
                </p>
              </div>
            ) : (
              <div className="v5-today-timeline">
                {todayRecords.map((record, index) => {
                  const displayParam = record.parameter.replace("_", " ").toUpperCase().replace(/\b\w/g, c => c.toUpperCase());
                  const timeStr = formatTimeOnly(record.recordedAt);

                  return (
                    <div
                      key={index}
                      className="v5-today-item today-record-row table-row-hover"
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
                        <span style={{ fontSize: "11px", color: "var(--v5-text-muted)", fontWeight: 600, background: "rgba(107, 100, 93, 0.1)", padding: "2px 8px", borderRadius: "10px" }}>
                          {record.timeContext ? record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1) : timeStr}
                        </span>
                        <strong style={{ fontSize: "14px", color: "var(--v5-text-dark)" }}>
                          {displayParam}
                        </strong>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "15px", color: "var(--v5-text-dark)" }}>
                          {record.value} <span style={{ fontSize: "12px", opacity: 0.6 }}>{record.unit}</span>
                          {record.parameter === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
                            <span style={{
                              fontSize: "10px",
                              background: "#FFF0E0",
                              color: "var(--v5-brand-orange)",
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              marginLeft: "6px"
                            }}>
                              {formatGlucoseContext(record.context)}
                            </span>
                          ) : null}
                        </strong>
                        <span style={{ color: "var(--v5-text-muted)" }}>→</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: High-Fidelity WhatsApp Smartphone Interface Mock */}
          <div style={{
            background: "#E5DDD5",
            backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
            backgroundSize: "contain",
            border: "1.5px solid var(--v5-border-subtle)",
            borderRadius: "16px",
            boxShadow: "var(--v5-shadow-md)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* WhatsApp App header bar */}
            <div style={{
              background: "#075E54",
              color: "#FFFFFF",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#128C7E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
              }}>
                💬
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>MediFlowAI Assistant</span>
                <span style={{ fontSize: "10px", color: "#25D366", fontWeight: 600 }}>Online</span>
              </div>
            </div>

            {/* Smartphone conversation screen area */}
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", minHeight: "180px" }}>
              {/* User green bubble */}
              <div style={{
                background: "#DCF8C6",
                color: "var(--v5-text-dark)",
                padding: "8px 12px",
                borderRadius: "8px 8px 0 8px",
                fontSize: "13px",
                alignSelf: "flex-end",
                maxWidth: "85%",
                boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
                position: "relative"
              }}>
                <div>Mera sugar level fasting me 110 hai aur BP 120/80 hai</div>
                <div style={{ textAlign: "right", fontSize: "9px", color: "rgba(0,0,0,0.4)", marginTop: "3px", display: "flex", gap: "2px", justifyContent: "flex-end", alignItems: "center" }}>
                  <span>08:15 AM</span>
                  <span style={{ color: "#34B7F1", display: "inline-flex" }}>✓✓</span>
                </div>
              </div>

              {/* AI structured white bubble */}
              <div style={{
                background: "#FFFFFF",
                color: "var(--v5-text-dark)",
                padding: "10px 14px",
                borderRadius: "8px 8px 8px 0",
                fontSize: "13px",
                alignSelf: "flex-start",
                maxWidth: "85%",
                boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
                border: "1px solid rgba(0,0,0,0.05)"
              }}>
                <div style={{ fontWeight: 600, color: "var(--v5-brand-green)", marginBottom: "4px", fontSize: "11px", textTransform: "uppercase" }}>MediFlowAI</div>
                <div>Fasting Blood Sugar of <strong>110 mg/dL</strong> and Blood Pressure of <strong>120/80 mmHg</strong> logged successfully! 🩺🩸</div>
                <div style={{ fontSize: "9px", color: "rgba(0,0,0,0.4)", marginTop: "4px" }}>
                  08:15 AM
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 4: 30-DAY HEALTH SUMMARY (REBRANDED AS "YOUR HEALTH AT A GLANCE") */}
      <section className="v5-summary-box" aria-labelledby="v5-summary-heading">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h2 id="v5-summary-heading" className="v5-section-heading" style={{ margin: 0 }}>
              Your Health at a Glance
            </h2>
            <p className="v5-metadata" style={{ marginTop: "4px" }}>
              Descriptive longitudinal overview computed directly from your logged parameters.
            </p>
          </div>

          {/* Toggle buttons */}
          <div style={{ background: "var(--v5-bg-cream)", borderRadius: "20px", padding: "4px", display: "inline-flex", border: "1px solid var(--v5-border-subtle)" }}>
            <button
              type="button"
              style={{
                border: "none",
                background: summaryMode === "summary" ? "var(--v5-bg-white)" : "transparent",
                color: summaryMode === "summary" ? "var(--v5-brand-orange)" : "var(--v5-text-muted)",
                fontWeight: 600,
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "16px",
                cursor: "pointer",
                boxShadow: summaryMode === "summary" ? "var(--v5-shadow-sm)" : "none"
              }}
              onClick={() => setSummaryMode("summary")}
            >
              Summary Text
            </button>
            <button
              type="button"
              style={{
                border: "none",
                background: summaryMode === "report" ? "var(--v5-bg-white)" : "transparent",
                color: summaryMode === "report" ? "var(--v5-brand-orange)" : "var(--v5-text-muted)",
                fontWeight: 600,
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "16px",
                cursor: "pointer",
                boxShadow: summaryMode === "report" ? "var(--v5-shadow-sm)" : "none"
              }}
              onClick={() => setSummaryMode("report")}
            >
              Structured Report
            </button>
          </div>
        </div>

        {(() => {
          const paramStyles: Record<string, { tint: string, border: string, text: string, leftBorder: string }> = {
            blood_sugar: { tint: "#FFFBF7", border: "#FEEADB", text: "var(--v5-brand-orange)", leftBorder: "var(--v5-brand-orange)" },
            blood_pressure: { tint: "#F0F9FF", border: "#E0F2FE", text: "var(--v5-brand-aqua)", leftBorder: "var(--v5-brand-aqua)" },
            heart_rate: { tint: "#FFF5F5", border: "#FFE4E6", text: "var(--v5-brand-coral)", leftBorder: "var(--v5-brand-coral)" },
            body_temperature: { tint: "#FFFDF0", border: "#FEF9C3", text: "var(--v5-brand-amber)", leftBorder: "var(--v5-brand-amber)" },
            weight: { tint: "#FAF5FF", border: "#F3E8FF", text: "var(--v5-brand-purple)", leftBorder: "var(--v5-brand-purple)" }
          };

          return summaryMode === "summary" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {hasAnyFactualSummaryData ? (
                factualSummaryBlocks.map((block) => {
                  const styleConfig = paramStyles[block.key] || { tint: "#FFFFFF", border: "var(--v5-border-subtle)", text: "var(--v5-text-dark)", leftBorder: "var(--v5-brand-orange)" };

                  return (
                    <div
                      key={block.key}
                      style={{
                        background: styleConfig.tint,
                        borderLeft: `4px solid ${styleConfig.leftBorder}`,
                        padding: "16px 20px",
                        borderRadius: "12px",
                        borderTop: `1.5px solid ${styleConfig.border}`,
                        borderRight: `1.5px solid ${styleConfig.border}`,
                        borderBottom: `1.5px solid ${styleConfig.border}`,
                        boxShadow: "var(--v5-shadow-sm)"
                      }}
                    >
                      <strong style={{ color: styleConfig.text, display: "block", marginBottom: "4px" }} className="v5-eyebrow">
                        {block.label}
                      </strong>
                      <p style={{ margin: 0, color: "var(--v5-text-dark)", fontSize: "14px", fontStyle: block.hasData ? "normal" : "italic" }}>
                        {block.text}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: "32px", textAlign: "center", background: "#FFFFFF", borderRadius: "12px", border: "1px dashed var(--v5-border-subtle)" }}>
                  <span style={{ color: "var(--v5-text-muted)", fontStyle: "italic" }}>No parameters logged in the last 30 days.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="v5-summary-grid">
              {factualSummaryBlocks.map((block) => {
                const isClickable = block.hasData;
                const styleConfig = paramStyles[block.key] || { tint: "#FFFFFF", border: "var(--v5-border-subtle)", text: "var(--v5-text-dark)", leftBorder: "var(--v5-brand-orange)" };

                return (
                  <div
                    key={block.key}
                    onClick={() => isClickable && setSelectedDrilldownBlock(block)}
                    className={`v5-summary-card ${block.key} ${isClickable ? "clickable" : ""}`}
                    style={{
                      background: styleConfig.tint,
                      border: `1.5px solid ${styleConfig.border}`,
                      borderLeft: `4px solid ${styleConfig.leftBorder}`,
                      cursor: isClickable ? "pointer" : "default"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <strong className="v5-eyebrow" style={{ color: styleConfig.text }}>{block.label}</strong>
                      {isClickable && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11px", color: "var(--v5-brand-orange)", fontWeight: 600 }}>Explore</span>
                          <span className="v5-action-text" style={{ fontSize: "11px", color: "var(--v5-brand-orange)" }}>→</span>
                        </div>
                      )}
                    </div>

                    {block.hasData && block.metrics ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderBottom: `1px solid ${styleConfig.border}`, paddingBottom: "4px" }}>
                          <span style={{ color: "var(--v5-text-muted)" }}>Latest:</span>
                          <strong style={{ color: "var(--v5-text-dark)" }}>{block.metrics.latest}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderBottom: `1px solid ${styleConfig.border}`, paddingBottom: "4px" }}>
                          <span style={{ color: "var(--v5-text-muted)" }}>Average:</span>
                          <strong style={{ color: "var(--v5-text-dark)" }}>{block.metrics.average}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                          <span style={{ color: "var(--v5-text-muted)" }}>Total Logs:</span>
                          <strong style={{ color: "var(--v5-text-dark)" }}>{block.metrics.count} readings</strong>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "var(--v5-text-muted)", fontSize: "13px", fontStyle: "italic" }}>
                        No logs registered
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div style={{
          marginTop: "24px",
          padding: "12px 16px",
          background: "rgba(107, 100, 93, 0.03)",
          border: "1px solid var(--v5-border-subtle)",
          borderRadius: "8px",
          fontSize: "11px",
          color: "var(--v5-text-muted)",
          lineHeight: "1.4"
        }}>
          ⚠️ <strong>Clinical Disclaimer:</strong> Automatically computed strictly from patient-reported measurements. This is for reference only and does not constitute formal medical diagnosis, advice, or treatment changes.
        </div>
      </section>

      <EditorialTransition text="“Your numbers matter more when you can see how they change.”" />

      {/* SECTION 5: LAB RESULTS */}
      <section className="v5-lab-box" aria-labelledby="v5-labs-heading">
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
            <h2 id="v5-labs-heading" className="v5-section-heading" style={{ margin: 0 }}>
              Lab Results
            </h2>
          </div>

          {onTabChange && (
            <button
              onClick={() => onTabChange("trends")}
              style={{
                background: "none",
                border: "1px solid var(--v5-brand-orange)",
                color: "var(--v5-brand-orange)",
                padding: "8px 16px",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--v5-brand-orange)";
                e.currentTarget.style.color = "#FFFFFF";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "var(--v5-brand-orange)";
              }}
            >
              Explore history →
            </button>
          )}
        </div>

        {isLabsLoading ? (
          <div style={{ padding: "16px", textAlign: "center", color: "var(--v5-text-muted)" }}>
            Loading lab findings...
          </div>
        ) : hasLabsError ? (
          <div style={{ padding: "16px", textAlign: "center", color: "var(--v5-brand-coral)" }}>
            Failed to retrieve laboratory records.
          </div>
        ) : labObservations.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", border: "1px dashed var(--v5-border-subtle)", borderRadius: "8px", background: "var(--v5-bg-white)", boxShadow: "var(--v5-shadow-sm)" }}>
            <span style={{ color: "var(--v5-text-muted)", fontStyle: "italic", fontSize: "14px", display: "block", marginBottom: "6px" }}>No laboratory records found</span>
            <span style={{ color: "var(--v5-text-muted)", fontSize: "12px" }}>Once you upload lab report documents on WhatsApp, they will be organized here securely.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {labObservations.slice(0, 3).map((obs, idx) => {
              const isAbnormal = obs.flag && (obs.flag.toLowerCase() === "high" || obs.flag.toLowerCase() === "low");

              return (
                <div key={idx} className="v5-lab-item-row" style={{
                  background: "#FFFDF6",
                  border: "1.5px solid #F9EBC8",
                  borderLeft: "5px solid var(--v5-brand-amber)",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "var(--v5-shadow-sm)",
                  transition: "all 0.2s"
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className="v5-metadata" style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", background: "#FEF3C7", color: "#B45309", padding: "2px 6px", borderRadius: "4px" }}>
                        Specimen
                      </span>
                      <span className="v5-metadata" style={{ fontSize: "11px" }}>
                        {new Date(obs.specimenDate || obs.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <strong style={{ fontSize: "15px", color: "var(--v5-text-dark)", fontWeight: 600 }}>
                      {obs.testName}
                    </strong>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <strong style={{ fontSize: "18px", color: "var(--v5-text-dark)", fontWeight: 600 }}>
                        {obs.value} <span style={{ fontSize: "12px", opacity: 0.6, fontWeight: 400 }}>{obs.unit}</span>
                      </strong>
                    </div>
                    {obs.flag && (
                      <span className={`v5-lab-flag-badge ${isAbnormal ? "high" : "normal"}`} style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        border: isAbnormal ? "1px solid #FCA5A5" : "1px solid #86EFAC"
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

      {/* SECTION 6: CTA GATEWAYS (SIBLINGS) */}
      {onTabChange && (
        <section className="v5-cta-grid">
          <div className="v5-cta-card trends">
            <div>
              <span className="v5-eyebrow" style={{ color: "var(--v5-brand-orange)" }}>Analyze Trends</span>
              <h3 style={{ fontSize: "18px", margin: "8px 0 10px 0", fontWeight: 600 }}>Detailed Trends & History</h3>
              <p className="v5-body" style={{ color: "var(--v5-text-muted)" }}>
                View complete charts and filter historical logs by day, parameter, or category.
              </p>
            </div>
            <button className="v5-cta-btn" onClick={() => onTabChange("trends")}>Explore Trends →</button>
          </div>

          <div className="v5-cta-card insights">
            <div>
              <span className="v5-eyebrow" style={{ color: "var(--v5-brand-purple)" }}>AI Health Insights</span>
              <h3 style={{ fontSize: "18px", margin: "8px 0 10px 0", fontWeight: 600 }}>AI Health Insights Hub</h3>
              <p className="v5-body" style={{ color: "var(--v5-text-muted)" }}>
                Get supportive, personalized wellness summaries of your longitudinal records.
              </p>
            </div>
            <button className="v5-cta-btn" onClick={() => onTabChange("ai-insights")}>Open Insights ✦</button>
          </div>
        </section>
      )}

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

export default DashboardViewV5;
