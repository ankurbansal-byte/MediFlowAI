import React, { useState } from "react";
import HealthSummary from "../components/HealthSummary";
import TrendChart from "../components/TrendChart";
import { type TrendRecord, type TrendPeriod } from "../components/TrendChart";
import { type HealthParameter } from "../hooks/useTrendData";
import { type TimelineRecord } from "../components/TimelineItem";
import { formatGlucoseContext, getLocalDateString } from "../utils/date";

interface TrendsViewProps {
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

  // Group chronological Health Records by recorded calendar date
  const groupedRecords = React.useMemo(() => {
    const groups: Record<string, TimelineRecord[]> = {};
    for (const r of timeline) {
      if (!r.recordedAt) continue;
      const key = getLocalDateString(r.recordedAt);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(r);
    }
    return groups;
  }, [timeline]);

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
        <p className="summary-section__eyebrow" style={{ margin: 0, color: "#238b82", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Health Analytics</p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.03em" }}>Health / Trends & Analysis</h1>
        <p style={{ margin: "6px 0 0 0", color: "var(--muted)", fontSize: "0.95rem" }}>
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
          padding: "12px 16px",
          background: "#f8fafc",
          border: "1px solid var(--line, #e4e7eb)",
          borderRadius: "10px"
        }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 750, color: "var(--muted, #486581)" }}>Glucose Filter:</span>
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
                borderRadius: "6px",
                border: glucoseContextFilter === ctx.id ? "2px solid #0080ff" : "1px solid var(--line, #e4e7eb)",
                background: glucoseContextFilter === ctx.id ? "#f4f8fc" : "transparent",
                color: glucoseContextFilter === ctx.id ? "#0080ff" : "var(--navy)",
                fontWeight: 700,
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
        <h2 id="full-history-title" style={{ margin: "0 0 8px 0", color: "var(--navy)", fontSize: "1.5rem", fontWeight: 800 }}>
          🏥 Complete Health History
        </h2>
        <p style={{ margin: "0 0 20px 0", color: "var(--muted)", fontSize: "0.95rem" }}>
          The chronological archive of all your logged health records and WhatsApp health updates.
        </p>

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
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--navy)", fontWeight: 800 }}>
                  📅 Calendar Navigation
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", width: "32px", height: "32px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    ←
                  </button>
                  <span style={{ fontWeight: 800, color: "var(--navy)", minWidth: "110px", textAlign: "center" }}>
                    {monthName} {yearNum}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", width: "32px", height: "32px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    →
                  </button>
                </div>
              </div>

              {/* Day header and grid */}
              <div className="calendar-grid-header">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                  <div key={dayName} style={{ fontWeight: 800, fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "10px 14px", flexWrap: "wrap", gap: "10px" }}>
                  <span style={{ fontSize: "0.88rem", color: "#1e40af", fontWeight: 650 }}>
                    🔍 Showing records for <strong>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(selectedHistoryDate))}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (setSelectedHistoryDate) {
                        setSelectedHistoryDate(null);
                      }
                    }}
                    style={{ background: "#ffffff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "4px 10px", fontSize: "0.8rem", color: "#0080ff", fontWeight: 750, cursor: "pointer" }}
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
                        <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--navy)", fontWeight: 800, letterSpacing: "0.02em" }}>
                          📅 {dateHeaderStr}
                        </h3>
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 750, textTransform: "uppercase" }}>
                          {group.records.length} HEALTH RECORD{group.records.length !== 1 ? "S" : ""}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {group.records.map((record, rIdx) => {
                          const displayParam = record.parameter.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                          const timeStr = formatRecordTimeOnly(record.recordedAt);

                          return (
                            <div
                              key={rIdx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "12px 16px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                fontSize: "0.95rem",
                                fontWeight: 700,
                                transition: "all 0.15s ease"
                              }}
                              className="table-row-hover"
                            >
                              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                                <span style={{ color: "var(--muted)", fontWeight: 750 }}>{timeStr}</span>
                                <span style={{ margin: "0 8px", color: "#cbd5e1" }}>—</span>
                                <span style={{ color: "var(--navy)", fontWeight: 800 }}>{displayParam}</span>
                                <span style={{ margin: "0 8px", color: "#cbd5e1" }}>—</span>
                                <strong style={{ color: "var(--navy)", fontWeight: 850 }}>
                                  {record.value} <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 650 }}>{record.unit}</span>
                                  {record.parameter === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
                                    <span style={{ color: "var(--muted)", fontWeight: 600 }}> · {formatGlucoseContext(record.context)}</span>
                                  ) : null}
                                </strong>
                              </div>
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
    </>
  );
};

export default TrendsView;
