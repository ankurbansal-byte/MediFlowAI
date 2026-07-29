import React, { useState, useEffect } from "react";
import HealthSummary from "../components/HealthSummary";
import TrendChart from "../components/TrendChart";
import { type TrendRecord, type TrendPeriod } from "../components/TrendChart";
import { type HealthParameter } from "../hooks/useTrendData";
import { type TimelineRecord } from "../components/TimelineItem";
import { formatGlucoseContext, getLocalDateString } from "../utils/date";
import api from "../api/axios";

interface TrendsViewProps {
  patientId?: string;
  trends: Record<HealthParameter, TrendRecord[]>;
  selectedParameter: HealthParameter;
  setSelectedParameter: (param: HealthParameter) => void;
  trendPeriod: TrendPeriod;
  setTrendPeriod: (period: TrendPeriod) => void;
  isTrendLoading: boolean;
  hasTrendError: boolean;
  trend: TrendRecord[];
  timeline: TimelineRecord[];
  selectedHistoryDate?: string | null;
  setSelectedHistoryDate?: (dateStr: string | null) => void;
}

const TrendsView: React.FC<TrendsViewProps> = ({
  patientId,
  trends,
  selectedParameter,
  setSelectedParameter,
  trendPeriod,
  setTrendPeriod,
  isTrendLoading,
  hasTrendError,
  trend,
  timeline,
  selectedHistoryDate,
  setSelectedHistoryDate,
}) => {
  const [glucoseContextFilter, setGlucoseContextFilter] = useState<string>("all");
  const [labObservations, setLabObservations] = useState<any[]>([]);
  const [isLabsLoading, setIsLabsLoading] = useState(false);
  const [hasLabsError, setHasLabsError] = useState(false);

  // Sprint 45 Unified Timeline Filters State
  const [historyCategory, setHistoryCategory] = useState<string>("all");
  const [historyTimeframe, setHistoryTimeframe] = useState<string>("all");

  useEffect(() => {
    if (patientId) {
      setIsLabsLoading(true);
      setHasLabsError(false);
      api.get(`/patient/lab-observations/${patientId}`)
        .then(res => {
          if (res.data.success) {
            setLabObservations(res.data.observations || []);
          } else {
            setHasLabsError(true);
          }
        })
        .catch(err => {
          console.error("Error fetching lab observations in TrendsView:", err);
          setHasLabsError(true);
        })
        .finally(() => {
          setIsLabsLoading(false);
        });
    }
  }, [patientId]);

  // Client-side filtering of the unified longitudinal timeline
  const filteredTimeline = React.useMemo(() => {
    let result = [...timeline];

    // Timeframe Filter (7, 30, 90 days)
    if (historyTimeframe !== "all") {
      const days = parseInt(historyTimeframe, 10);
      if (!isNaN(days)) {
        const limit = new Date();
        limit.setDate(limit.getDate() - days);
        result = result.filter(r => r.recordedAt && new Date(r.recordedAt).getTime() >= limit.getTime());
      }
    }

    // Category Filter
    if (historyCategory !== "all") {
      if (historyCategory === "lab") {
        result = result.filter(r => r.category === "lab_observation");
      } else {
        result = result.filter(r => r.category === "health_reading" && r.parameter === historyCategory);
      }
    }

    return result;
  }, [timeline, historyCategory, historyTimeframe]);

  // Group chronological Health Records by recorded calendar date
  const groupedRecords = React.useMemo(() => {
    const groups: Record<string, TimelineRecord[]> = {};
    for (const r of filteredTimeline) {
      if (!r.recordedAt) continue;
      const key = getLocalDateString(r.recordedAt);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(r);
    }
    for (const key in groups) {
      groups[key].sort((a, b) => {
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
    }
    return groups;
  }, [filteredTimeline]);

  const recordDates = React.useMemo(() => {
    return Object.keys(groupedRecords);
  }, [groupedRecords]);

  // Manage calendar active month state
  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
    if (selectedHistoryDate) {
      return new Date(selectedHistoryDate);
    }
    if (timeline.length > 0 && timeline[0].recordedAt) {
      return new Date(timeline[0].recordedAt);
    }
    return new Date();
  });

  React.useEffect(() => {
    if (selectedHistoryDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentMonth(new Date(selectedHistoryDate));
    }
  }, [selectedHistoryDate]);

  // Calendar math helpers
  const calendarDays = React.useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthName = currentMonth.toLocaleString("en-US", { month: "long" });
  const yearNum = currentMonth.getFullYear();

  const formatRecordTimeOnly = (recordedAt?: string) => {
    if (!recordedAt) return "—";
    const date = new Date(recordedAt);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  };

  // Group records that are going to be displayed based on date filtering
  const groupedAndFilteredTimeline = React.useMemo(() => {
    const groups: { dateStr: string; dateObj: Date; records: TimelineRecord[] }[] = [];

    const sortedDates = [...recordDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    for (const dStr of sortedDates) {
      if (selectedHistoryDate && dStr !== selectedHistoryDate) {
        continue;
      }
      const recs = groupedRecords[dStr] || [];
      if (recs.length > 0) {
        groups.push({
          dateStr: dStr,
          dateObj: new Date(recs[0].recordedAt || dStr),
          records: recs
        });
      }
    }
    return groups;
  }, [recordDates, groupedRecords, selectedHistoryDate]);

  const filteredTrends = React.useMemo(() => {
    if (selectedParameter !== "blood_sugar" || glucoseContextFilter === "all") {
      return trends;
    }
    return {
      ...trends,
      blood_sugar: trends.blood_sugar.filter(r => r.context === glucoseContextFilter)
    };
  }, [trends, selectedParameter, glucoseContextFilter]);

  const filteredTrend = React.useMemo(() => {
    if (selectedParameter !== "blood_sugar" || glucoseContextFilter === "all") {
      return trend;
    }
    return trend.filter(r => r.context === glucoseContextFilter);
  }, [trend, selectedParameter, glucoseContextFilter]);

  return (
    <>
      <div className="trends-header" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--line)", marginBottom: "28px" }}>
        <p className="summary-section__eyebrow" style={{ margin: 0, color: "var(--color-brand-primary)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Health Analytics</p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy)", fontSize: "1.6rem", fontWeight: 600, letterSpacing: "-0.02em" }}>Health Records / Trends & Analysis</h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
          View and analyze your physiological trends and historical health measurements.
        </p>
      </div>

      <HealthSummary
        trends={filteredTrends}
        selectedParameter={selectedParameter}
        setSelectedParameter={setSelectedParameter}
        period={trendPeriod}
        isLoading={isTrendLoading}
      />

      {/* Glucose Context Filter Row */}
      {selectedParameter === "blood_sugar" && (
        <div style={{
          marginTop: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          padding: "10px 16px",
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)"
        }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Glucose Filter:</span>
          {([
            { id: "all", label: "All" },
            { id: "fasting", label: "Fasting" },
            { id: "pre_meal", label: "Pre-meal" },
            { id: "post_meal", label: "Post-meal" },
            { id: "random", label: "Random" }
          ]).map((ctx) => (
            <button
              key={ctx.id}
              onClick={() => setGlucoseContextFilter(ctx.id)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                border: glucoseContextFilter === ctx.id ? "2px solid var(--color-brand-primary)" : "1px solid var(--color-border)",
                background: glucoseContextFilter === ctx.id ? "var(--color-brand-bg-subtle)" : "transparent",
                color: glucoseContextFilter === ctx.id ? "var(--color-brand-primary)" : "var(--color-text-secondary)",
                fontWeight: 600,
                fontSize: "0.8rem",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              type="button"
            >
              {ctx.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: "40px" }}>
        <TrendChart
          hasError={hasTrendError}
          isLoading={isTrendLoading}
          onPeriodChange={setTrendPeriod}
          period={trendPeriod}
          records={filteredTrend}
          parameter={selectedParameter}
        />
      </div>

      {/* Complete Historical Record List with Calendar and Date-Grouping */}
      <section aria-labelledby="full-history-title" style={{ borderTop: "1px solid var(--line)", paddingTop: "40px", marginTop: "40px" }}>
        <h2 id="full-history-title" style={{ margin: "0 0 4px 0", color: "var(--navy)", fontSize: "1.25rem", fontWeight: 600 }}>
          Complete Health History
        </h2>
        <p style={{ margin: "0 0 20px 0", color: "var(--muted)", fontSize: "0.88rem" }}>
          The chronological archive of all your logged health records and WhatsApp health updates.
        </p>

        {/* Sprint 45 Unified Timeline Filters */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginBottom: "24px",
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "16px"
        }}>
          {/* Category Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Category:</span>
            {[
              { id: "all", label: "All Records" },
              { id: "blood_pressure", label: "Blood Pressure" },
              { id: "blood_sugar", label: "Blood Sugar" },
              { id: "heart_rate", label: "Heart Rate" },
              { id: "oxygen_saturation", label: "Oxygen" },
              { id: "body_temperature", label: "Temperature" },
              { id: "weight", label: "Weight" },
              { id: "lab", label: "Lab Results" }
            ].map(cat => (
              <button
                key={cat.id}
                id={`cat-filter-${cat.id}`}
                type="button"
                onClick={() => setHistoryCategory(cat.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: historyCategory === cat.id ? "2px solid var(--color-brand-primary)" : "1px solid var(--color-border)",
                  background: historyCategory === cat.id ? "var(--color-brand-bg-subtle)" : "#ffffff",
                  color: historyCategory === cat.id ? "var(--color-brand-primary)" : "var(--color-text-secondary)",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer"
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Timeframe Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>Timeframe:</span>
            {[
              { id: "all", label: "All" },
              { id: "7", label: "7 Days" },
              { id: "30", label: "30 Days" },
              { id: "90", label: "90 Days" }
            ].map(tf => (
              <button
                key={tf.id}
                id={`tf-filter-${tf.id}`}
                type="button"
                onClick={() => setHistoryTimeframe(tf.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: historyTimeframe === tf.id ? "2px solid var(--color-brand-primary)" : "1px solid var(--color-border)",
                  background: historyTimeframe === tf.id ? "var(--color-brand-bg-subtle)" : "#ffffff",
                  color: historyTimeframe === tf.id ? "var(--color-brand-primary)" : "var(--color-text-secondary)",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer"
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {timeline.length === 0 ? (
          <div className="clinical-state-card clinical-state-card--empty">
            <span className="clinical-state-card__icon" aria-hidden="true">◈</span>
            <div className="clinical-state-card__content">
              <h3 className="clinical-state-card__title">No Records Available</h3>
              <p className="clinical-state-card__message">
                There are currently no physiological observations recorded in your history.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Calendar Widget */}
            <div className="calendar-widget-container">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", color: "var(--navy)", fontWeight: 600 }}>
                  📅 Calendar Navigation
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    style={{ background: "#ffffff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", width: "32px", height: "32px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    ←
                  </button>
                  <span style={{ fontWeight: 600, color: "var(--navy)", minWidth: "110px", textAlign: "center", fontSize: "0.9rem" }}>
                    {monthName} {yearNum}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    style={{ background: "#ffffff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", width: "32px", height: "32px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    →
                  </button>
                </div>
              </div>

              {/* Day header and grid */}
              <div className="calendar-grid-header">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                  <div key={dayName} style={{ fontWeight: 600, fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {dayName}
                  </div>
                ))}
              </div>
              <div className="calendar-grid-days">
                {calendarDays.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} />;
                  }
                  const dayStr = getLocalDateString(day);
                  const dayRecords = groupedRecords[dayStr] || [];
                  const hasRecords = dayRecords.length > 0;
                  const isSelected = selectedHistoryDate === dayStr;

                  return (
                    <button
                      key={dayStr}
                      type="button"
                      onClick={() => {
                        if (setSelectedHistoryDate) {
                          setSelectedHistoryDate(isSelected ? null : dayStr);
                        }
                      }}
                      className={`calendar-day-btn ${isSelected ? "calendar-day-btn--selected" : ""} ${hasRecords ? "calendar-day-btn--has-records" : ""}`}
                      title={hasRecords ? `${dayRecords.length} record(s)` : "No records"}
                    >
                      <span className="calendar-day-num">
                        {day.getDate()}
                      </span>
                      {hasRecords && (
                        <span className="calendar-day-count">
                          {dayRecords.length} rec{dayRecords.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Status and Reset */}
              {selectedHistoryDate && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", background: "var(--color-brand-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "10px 14px", flexWrap: "wrap", gap: "10px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-brand-primary)", fontWeight: 500 }}>
                    🔍 Showing records for <strong>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(selectedHistoryDate))}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (setSelectedHistoryDate) {
                        setSelectedHistoryDate(null);
                      }
                    }}
                    style={{ background: "#ffffff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "4px 10px", fontSize: "0.8rem", color: "var(--color-brand-primary)", fontWeight: 600, cursor: "pointer" }}
                  >
                    Show All Dates
                  </button>
                </div>
              )}
            </div>

            {/* Date-Grouped Records List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {groupedAndFilteredTimeline.length === 0 ? (
                <p style={{ margin: "10px 0", fontStyle: "italic", color: "var(--muted)", fontWeight: 550 }}>
                  No health records found for the selected date.
                </p>
              ) : (
                groupedAndFilteredTimeline.map((group) => {
                  const dateHeaderStr = new Intl.DateTimeFormat("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  }).format(group.dateObj).toUpperCase();

                  return (
                    <div key={group.dateStr} style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(10,37,64,0.01)" }}>
                      <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "10px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--navy)", fontWeight: 600, letterSpacing: "0.02em" }}>
                          📅 {dateHeaderStr}
                        </h3>
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, textTransform: "uppercase" }}>
                          {group.records.length} HEALTH RECORD{group.records.length !== 1 ? "S" : ""}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {group.records.map((record, rIdx) => {
                          const isLab = record.category === "lab_observation";
                          const displayParam = record.displayLabel || (isLab ? record.testName : record.parameter.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
                          const timeStr = record.timeContext ? record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1) : formatRecordTimeOnly(record.recordedAt);

                          return (
                            <div
                              key={rIdx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "12px 16px",
                                background: isLab ? "#fbfaff" : "#f8fafc",
                                border: isLab ? "1px solid #e0d7ff" : "1px solid #e2e8f0",
                                borderRadius: "8px",
                                fontSize: "0.95rem",
                                fontWeight: 500,
                                transition: "all 0.15s ease"
                              }}
                              className="table-row-hover"
                            >
                              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                                <span style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 500,
                                  background: isLab ? "#f5f3ff" : "#e2e8f0",
                                  color: isLab ? "#6b21a8" : "#475569",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  marginRight: "10px",
                                  textTransform: "uppercase"
                                }}>
                                  {isLab ? "LAB" : "ROUTINE"}
                                </span>
                                <span style={{ color: "var(--muted)", fontWeight: 500 }}>{timeStr}</span>
                                <span style={{ margin: "0 8px", color: "#cbd5e1" }}>—</span>
                                <span style={{ color: "var(--navy)", fontWeight: 600 }}>{displayParam}</span>
                                <span style={{ margin: "0 8px", color: "#cbd5e1" }}>—</span>
                                <strong style={{ color: "var(--navy)", fontWeight: 600 }}>
                                  {record.value} <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 400 }}>{record.unit}</span>
                                  {!isLab && record.parameter === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
                                    <span style={{ color: "var(--muted)", fontWeight: 500 }}> · {formatGlucoseContext(record.context)}</span>
                                  ) : null}
                                </strong>
                              </div>

                              {isLab && (record.referenceRangeText || record.flag) && (
                                <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                                  {record.referenceRangeText && <span>Ref: <strong>{record.referenceRangeText}</strong></span>}
                                  {record.flag && (
                                    <span style={{
                                      marginLeft: "8px",
                                      fontWeight: 600,
                                      color: record.flag.toLowerCase() === "high" || record.flag.toLowerCase() === "low" ? "#ef4444" : "#10b981",
                                      textTransform: "uppercase"
                                    }}>
                                      [{record.flag}]
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </section>

      {/* Your Lab Results Section */}
      <section aria-labelledby="lab-results-title" style={{ borderTop: "1px solid var(--line)", paddingTop: "40px", marginTop: "40px" }}>
        <h2 id="lab-results-title" style={{ margin: "0 0 8px 0", color: "var(--navy)", fontSize: "1.25rem", fontWeight: 600 }}>
          🧪 Your Lab Results
        </h2>
        <p style={{ margin: "0 0 20px 0", color: "var(--muted)", fontSize: "0.88rem" }}>
          Laboratory findings and observations extracted from your shared reports.
        </p>

        {isLabsLoading ? (
          <div style={{ padding: "20px", color: "var(--muted)", fontStyle: "italic", fontSize: "0.88rem" }}>
            Loading lab results...
          </div>
        ) : hasLabsError ? (
          <div style={{ padding: "20px", border: "1px dashed #fda4af", borderRadius: "8px", color: "#ef4444", fontSize: "0.88rem", fontWeight: 500 }}>
            Failed to retrieve laboratory records. Please check your connection and try again.
          </div>
        ) : labObservations.length === 0 ? (
          <div style={{ padding: "20px", border: "1px dashed var(--line)", borderRadius: "8px", color: "var(--muted)", fontStyle: "italic", fontSize: "0.85rem" }}>
            No laboratory records found. Send a report via WhatsApp to see observations here.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {labObservations.map((obs, idx) => (
              <div key={idx} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "#ffffff",
                border: "1px solid var(--line, #e4e7eb)",
                borderRadius: "10px",
                fontWeight: 500,
                fontSize: "0.88rem"
              }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, display: "block" }}>
                    {new Date(obs.specimenDate || obs.createdAt).toLocaleDateString()}
                  </span>
                  <span style={{ color: "var(--navy)", fontWeight: 600, fontSize: "0.95rem" }}>
                    {obs.testName}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ fontSize: "1.05rem", color: "var(--navy)", fontWeight: 600 }}>
                    {obs.value} <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 400 }}>{obs.unit}</span>
                  </strong>
                  {obs.flag && (
                    <span style={{
                      display: "block",
                      marginTop: "2px",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: obs.flag.toLowerCase() === "high" || obs.flag.toLowerCase() === "low" ? "#ef4444" : "#10b981"
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
    </>
  );
};

export default TrendsView;
