import React, { useState } from "react";
import HealthSummary from "../components/HealthSummary";
import TrendChart from "../components/TrendChart";
import { type TrendRecord, type TrendPeriod } from "../components/TrendChart";
import { type HealthParameter } from "../hooks/useTrendData";
import { type TimelineRecord } from "../components/TimelineItem";
import { formatRecordDateTime, formatGlucoseContext } from "../utils/date";

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
}) => {
  const [glucoseContextFilter, setGlucoseContextFilter] = useState<string>("all");

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

      {/* Complete Historical Record List */}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {timeline.map((record, index) => {
              const displayParam = record.parameter.replace("_", " ").toUpperCase().replace(/\b\w/g, c => c.toUpperCase());
              const dateStr = record.recordedAt ? formatRecordDateTime(record.recordedAt) : "—";

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
                      {record.parameter === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", marginLeft: "4px" }}> · {formatGlucoseContext(record.context)}</span>
                      ) : null}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
};

export default TrendsView;
