import React from "react";
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
}) => {
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
          text: `No ${p.label.toLowerCase()} readings recorded in the last 30 days.`
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
            text: `No valid BP readings in the last 30 days.`
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
          text: `Last 30 Days: ${records.length} BP readings recorded. Average: ${avgSys}/${avgDia} mmHg. Range: ${minSys}/${minDia} to ${maxSys}/${maxDia} mmHg. Latest: ${latestVal} mmHg.`
        };
      }

      const numericValues = records.map(r => Number(r.value)).filter(v => !isNaN(v));
      if (numericValues.length === 0) {
        return {
          key: p.key,
          label: p.label,
          hasData: false,
          text: `No numeric ${p.label.toLowerCase()} readings recorded in the last 30 days.`
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
        text: `Last 30 Days: ${records.length} ${p.label.toLowerCase()} readings recorded. Average: ${avgVal} ${p.unit}. Range: ${minVal}–${maxVal} ${p.unit}. Latest: ${latestVal} ${p.unit}.`
      };
    });
  }, [timeline]);

  const hasAnyFactualSummaryData = React.useMemo(() => {
    return factualSummaryBlocks.some(block => block.hasData);
  }, [factualSummaryBlocks]);

  // Helper to format timestamps nicely
  const formatRecordDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getLatestRecord = (key: string) => {
    if (!summary) return null;
    const record = (summary as Record<string, { value?: string | number; unit?: string; recordedAt?: string } | undefined>)[key];
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
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* Patient Greeting & Identity Header */}
        <div className="patient-welcome-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "24px", marginBottom: "24px", gap: "20px", flexWrap: "wrap" }}>
          <div className="patient-welcome-section__info" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <h1 className="patient-welcome-section__title" style={{ margin: 0, color: "var(--navy, #0a2540)", fontSize: "clamp(1.8rem, 3.2vw, 2.5rem)", fontWeight: 850, letterSpacing: "-0.04em" }}>
              Welcome, {user.fullName || user.username}
            </h1>
            <p className="patient-welcome-section__id" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--muted, #486581)" }}>
              Patient ID: {user.patientId || user.username}
            </p>
            <p className="patient-welcome-section__subtitle" style={{ margin: "4px 0 0 0", color: "#627d98", fontSize: "0.95rem", fontWeight: 500 }}>
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
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
              padding: "12px 18px",
              color: "#166534",
              fontSize: "0.88rem",
              fontWeight: 600,
              maxWidth: "450px",
              lineHeight: "1.4",
              cursor: "pointer"
            }}
            title="Click to manually submit a record"
          >
            <span style={{ fontSize: "1.25rem" }}>💬</span>
            <span>Health updates are automatically organized from your connected WhatsApp submissions.</span>
          </div>
        </div>

        {/* Latest Health Snapshot Grid */}
        <section aria-labelledby="latest-snapshot-title">
          <h2 id="latest-snapshot-title" style={{ margin: "0 0 16px 0", color: "var(--navy)", fontSize: "1.5rem", fontWeight: 800 }}>
            ⚡ Latest Health Snapshot
          </h2>
          <div className="summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            {snapshotParameters.map((param) => {
              const record = getLatestRecord(param.key);
              return (
                <div
                  key={param.key}
                  style={{
                    background: "#ffffff",
                    border: "1px solid var(--line, #e4e7eb)",
                    borderRadius: "14px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    boxShadow: "0 4px 16px rgba(23, 49, 84, 0.02)",
                    opacity: record ? 1 : 0.75
                  }}
                >
                  <span style={{ fontSize: "1.6rem" }}>{param.icon}</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    {param.label}
                  </span>
                  {record ? (
                    <>
                      <strong style={{ fontSize: "1.45rem", color: "var(--navy, #0a2540)", fontWeight: 850 }}>
                        {record.value} <span style={{ fontSize: "0.8rem", color: "var(--muted, #486581)", fontWeight: 600 }}>{record.unit || param.fallbackUnit}</span>
                      </strong>
                      <span style={{ fontSize: "0.72rem", color: "#627d98", fontWeight: 550 }}>
                        As of {formatRecordDate(record.recordedAt)}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: "0.9rem", color: "var(--muted, #486581)", fontStyle: "italic", fontWeight: 600 }}>
                      No data available
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Factual Clinical Summary Card */}
        <section aria-labelledby="factual-summary-title" style={{
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "14px",
          padding: "24px",
          boxShadow: "0 4px 16px rgba(10, 37, 64, 0.02)"
        }}>
          <h3 id="factual-summary-title" style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.25rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
            📊 Factual Clinical Summary (Last 30 Days)
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem" }}>
            {hasAnyFactualSummaryData ? (
              factualSummaryBlocks.map((block) => (
                <div key={block.key} style={{ paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" }}>
                  <strong style={{ color: "#0080ff", textTransform: "uppercase", fontSize: "0.75rem", display: "block", marginBottom: "3px" }}>
                    {block.label}
                  </strong>
                  <p style={{ margin: 0, color: "var(--navy, #0a2540)", fontWeight: 600, fontStyle: block.hasData ? "normal" : "italic" }}>
                    {block.text}
                  </p>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, color: "var(--muted)", fontStyle: "italic", fontWeight: 550 }}>
                Insufficient data to formulate a factual summary for the last 30 days.
              </p>
            )}
          </div>
          <div style={{ marginTop: "18px", padding: "12px", background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "10px", fontSize: "0.75rem", color: "#9d174d", fontWeight: 650, lineHeight: "1.5" }}>
            ⚠️ Factual Clinical Disclaimer: This summary is automatically derived strictly from recorded patient-reported values. It is descriptive and factual only. It does not diagnose disease, recommend medication, change treatment, claim medical certainty, or make clinical decisions. Any clinical adjustments must be made by the licensed practitioner.
          </div>
        </section>

        {/* Quick Actions / Navigation */}
        {onTabChange && (
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <button
              onClick={() => onTabChange("trends")}
              className="btn-add-record"
              style={{
                background: "#0080ff",
                boxShadow: "0 4px 12px rgba(0, 128, 255, 0.2)",
                flex: 1,
                justifyContent: "center",
                padding: "14px 20px"
              }}
            >
              📈 Detailed Trends & History
            </button>
            <button
              onClick={() => onTabChange("ai-insights")}
              className="btn-add-record"
              style={{
                background: "#7556ce",
                boxShadow: "0 4px 12px rgba(117, 86, 206, 0.2)",
                flex: 1,
                justifyContent: "center",
                padding: "14px 20px"
              }}
            >
              ✦ AI Clinical Insights
            </button>
          </div>
        )}

        {/* Longitudinal Health History Chronological Record */}
        <section aria-labelledby="health-history-title" style={{ borderTop: "1px solid var(--line)", paddingTop: "28px" }}>
          <h2 id="health-history-title" style={{ margin: "0 0 8px 0", color: "var(--navy)", fontSize: "1.5rem", fontWeight: 800 }}>
            🏥 Longitudinal Health History
          </h2>
          <p style={{ margin: "0 0 20px 0", color: "var(--muted)", fontSize: "0.95rem" }}>
            Chronological journal of your recorded vitals and WhatsApp health submissions.
          </p>

          {timeline.length === 0 ? (
            <div className="clinical-state-card clinical-state-card--empty">
              <span className="clinical-state-card__icon" aria-hidden="true">◈</span>
              <div className="clinical-state-card__content">
                <h3 className="clinical-state-card__title">No Records Available</h3>
                <p className="clinical-state-card__message">
                  There are currently no physiological observations recorded in your history. Send a message on WhatsApp to begin!
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {timeline.slice(0, 8).map((record, index) => {
                const displayParam = record.parameter.replace("_", " ").toUpperCase().replace(/\b\w/g, c => c.toUpperCase());
                const dateStr = record.recordedAt ? new Date(record.recordedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                }) : "—";

                return (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px",
                      background: "#ffffff",
                      border: "1px solid var(--line, #e4e7eb)",
                      borderRadius: "10px",
                      transition: "all 0.15s ease"
                    }}
                    className="table-row-hover"
                  >
                    <div>
                      <span style={{
                        fontSize: "0.82rem",
                        color: "#627d98",
                        fontWeight: 800,
                        display: "block",
                        marginBottom: "4px"
                      }}>
                        {dateStr}
                      </span>
                      <span style={{
                        fontSize: "1.05rem",
                        color: "var(--navy, #0a2540)",
                        fontWeight: 800,
                        display: "block"
                      }}>
                        {displayParam}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong style={{
                        fontSize: "1.25rem",
                        color: "var(--navy, #0a2540)",
                        fontWeight: 850
                      }}>
                        {record.value} <span style={{ fontSize: "0.8rem", fontWeight: 650, color: "var(--muted)" }}>{record.unit}</span>
                      </strong>
                    </div>
                  </div>
                );
              })}
              {timeline.length > 8 && (
                <button
                  onClick={() => onTabChange && onTabChange("trends")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0080ff",
                    fontWeight: 750,
                    fontSize: "0.92rem",
                    cursor: "pointer",
                    marginTop: "10px",
                    textAlign: "center"
                  }}
                >
                  Show all history records in Health / Trends →
                </button>
              )}
            </div>
          )}
        </section>
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
