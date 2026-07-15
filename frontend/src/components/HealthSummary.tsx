import { useMemo } from "react";
import { type TrendRecord, type TrendPeriod } from "./TrendChart";
import { type HealthParameter } from "../hooks/useTrendData";
import { calculateParameterStats, calculateReadingConsistency } from "../utils/stats";

type HealthSummaryProps = {
  trends: Record<HealthParameter, TrendRecord[]>;
  selectedParameter: HealthParameter;
  setSelectedParameter: (param: HealthParameter) => void;
  period: TrendPeriod;
  isLoading: boolean;
};

const parameterConfigs: Record<
  HealthParameter,
  { label: string; icon: string; accent: "blue" | "rose" | "violet" | "orange" | "teal" }
> = {
  blood_sugar: { label: "Blood Sugar", icon: "◒", accent: "blue" },
  blood_pressure: { label: "Blood Pressure", icon: "♥", accent: "rose" },
  heart_rate: { label: "Heart Rate", icon: "⌁", accent: "violet" },
  body_temperature: { label: "Temperature", icon: "°", accent: "orange" },
  weight: { label: "Weight", icon: "◈", accent: "teal" },
};

const HealthSummary = ({
  trends,
  selectedParameter,
  setSelectedParameter,
  period,
  isLoading,
}: HealthSummaryProps) => {
  // Compute stats for all 5 parameters
  const allStats = useMemo(() => {
    const statsMap = {} as Record<HealthParameter, ReturnType<typeof calculateParameterStats>>;
    const keys: HealthParameter[] = [
      "blood_sugar",
      "blood_pressure",
      "heart_rate",
      "body_temperature",
      "weight",
    ];
    keys.forEach((key) => {
      statsMap[key] = calculateParameterStats(trends[key] || [], key);
    });
    return statsMap;
  }, [trends]);

  // Compute consistency info for the selected parameter
  const activeStats = allStats[selectedParameter];
  const consistencyInfo = useMemo(() => {
    return calculateReadingConsistency(activeStats.count, period);
  }, [activeStats.count, period]);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "Rising":
        return "↗";
      case "Falling":
        return "↘";
      case "Stable":
        return "→";
      default:
        return "—";
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case "Rising":
        return "#c84d64"; // rose
      case "Falling":
        return "#178f80"; // teal
      case "Stable":
        return "#52627d"; // muted
      default:
        return "var(--muted)";
    }
  };

  return (
    <section className="health-summary-section" style={{ marginTop: "42px", paddingTop: "34px", borderTop: "1px solid var(--line)" }} aria-labelledby="health-summary-engine-title">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "22px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <p className="summary-section__eyebrow" style={{ margin: 0, color: "#238b82", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Clinical Metrics</p>
          <h2 id="health-summary-engine-title" style={{ margin: "4px 0 0 0", color: "var(--navy)", fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.025em" }}>Health Summary Engine</h2>
        </div>
        <div style={{ fontSize: "0.84rem", color: "var(--muted)", fontWeight: "600" }}>
          Analyzing: <span style={{ color: "var(--navy)", fontWeight: "700" }}>Last {period} Days</span>
        </div>
      </div>

      <p style={{ margin: "0 0 24px 0", color: "var(--muted)", fontSize: "0.92rem", lineHeight: "1.5" }}>
        A detailed summary of physiological parameters, recording frequency, and consistency patterns computed from the patient's active trend data.
      </p>

      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
          {/* Skeleton left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="summary-card--loading" style={{ height: "70px", borderRadius: "10px" }} />
            ))}
          </div>
          {/* Skeleton right column */}
          <div className="summary-card--loading" style={{ height: "400px", borderRadius: "14px" }} />
        </div>
      ) : (
        <div className="health-summary-grid" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px" }}>

          {/* Left Column: Parameter selector tabs */}
          <div className="health-summary-sidebar" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {(Object.keys(parameterConfigs) as HealthParameter[]).map((key) => {
              const config = parameterConfigs[key];
              const stats = allStats[key];
              const isSelected = selectedParameter === key;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedParameter(key)}
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderRadius: "10px",
                    border: isSelected ? "2px solid #238b82" : "1px solid var(--line)",
                    background: isSelected ? "#e7f8f5" : "var(--surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "0 4px 12px rgba(35, 139, 130, 0.1)" : "none",
                    outline: "none",
                    width: "100%",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div className={`summary-card__icon summary-card__icon--${config.accent}`} style={{ margin: 0, width: "32px", height: "32px", borderRadius: "8px", fontSize: "0.95rem" }}>
                      {config.icon}
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: "0.88rem", color: "var(--navy)", fontWeight: "750" }}>{config.label}</strong>
                      <span style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
                        {stats.count} record{stats.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "block", fontSize: "0.95rem", fontWeight: "800", color: "var(--navy)" }}>
                      {stats.latest}
                    </span>
                    {stats.latest !== "—" && stats.unit && (
                      <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: "600" }}>{stats.unit}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Detailed summary of selected parameter */}
          <div
            className="health-summary-details-card"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "14px",
              padding: "28px",
              boxShadow: "0 4px 16px rgba(23, 49, 84, 0.03)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Detailed Header */}
            <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: "18px", marginBottom: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <span style={{
                    fontSize: "0.72rem",
                    fontWeight: "800",
                    color: getTrendColor(activeStats.trendDirection),
                    background: activeStats.trendDirection === "No Data" ? "#f1f5f9" : (activeStats.trendDirection === "Stable" ? "#e7f8f5" : (activeStats.trendDirection === "Rising" ? "#fff0f2" : "#f1eeff")),
                    padding: "3px 8px",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>
                    {activeStats.trendDirection} Trend
                  </span>
                  <h3 style={{ margin: "8px 0 2px 0", color: "var(--navy)", fontSize: "1.35rem", fontWeight: "800" }}>
                    {parameterConfigs[selectedParameter].label} Summary
                  </h3>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.82rem" }}>
                    Physiological report based on data collected over the active timeframe.
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ display: "block", fontSize: "0.74rem", fontWeight: "750", color: "#7e8ba1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Last Updated</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--navy)" }}>{activeStats.lastUpdated}</span>
                </div>
              </div>
            </div>

            {/* Core Metrics Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px" }}>

              {/* Metric 1: Latest Reading */}
              <div style={{ background: "#f8fafc", border: "1px solid #eef2f6", borderRadius: "10px", padding: "16px" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.74rem", fontWeight: "750", textTransform: "uppercase", letterSpacing: "0.05em" }}>Latest Reading</span>
                <div style={{ marginTop: "6px", display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <strong style={{ fontSize: "1.75rem", fontWeight: "900", color: "var(--navy)", letterSpacing: "-0.03em" }}>{activeStats.latest}</strong>
                  {activeStats.latest !== "—" && activeStats.unit && (
                    <span style={{ fontSize: "0.88rem", color: "var(--muted)", fontWeight: "700" }}>{activeStats.unit}</span>
                  )}
                </div>
              </div>

              {/* Metric 2: Average */}
              <div style={{ background: "#f8fafc", border: "1px solid #eef2f6", borderRadius: "10px", padding: "16px" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.74rem", fontWeight: "750", textTransform: "uppercase", letterSpacing: "0.05em" }}>Average Value</span>
                <div style={{ marginTop: "6px", display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <strong style={{ fontSize: "1.75rem", fontWeight: "900", color: "var(--navy)", letterSpacing: "-0.03em" }}>{activeStats.average}</strong>
                  {activeStats.average !== "—" && activeStats.unit && (
                    <span style={{ fontSize: "0.88rem", color: "var(--muted)", fontWeight: "700" }}>{activeStats.unit}</span>
                  )}
                </div>
              </div>

              {/* Metric 3: Highest */}
              <div style={{ background: "#f8fafc", border: "1px solid #eef2f6", borderRadius: "10px", padding: "16px" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.74rem", fontWeight: "750", textTransform: "uppercase", letterSpacing: "0.05em" }}>Highest Reading</span>
                <div style={{ marginTop: "6px", display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <strong style={{ fontSize: "1.45rem", fontWeight: "850", color: "#c84d64", letterSpacing: "-0.02em" }}>{activeStats.highest}</strong>
                  {activeStats.highest !== "—" && activeStats.unit && (
                    <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: "700" }}>{activeStats.unit}</span>
                  )}
                </div>
              </div>

              {/* Metric 4: Lowest */}
              <div style={{ background: "#f8fafc", border: "1px solid #eef2f6", borderRadius: "10px", padding: "16px" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.74rem", fontWeight: "750", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lowest Reading</span>
                <div style={{ marginTop: "6px", display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <strong style={{ fontSize: "1.45rem", fontWeight: "850", color: "#178f80", letterSpacing: "-0.02em" }}>{activeStats.lowest}</strong>
                  {activeStats.lowest !== "—" && activeStats.unit && (
                    <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: "700" }}>{activeStats.unit}</span>
                  )}
                </div>
              </div>

              {/* Metric 5: Total Readings */}
              <div style={{ background: "#f8fafc", border: "1px solid #eef2f6", borderRadius: "10px", padding: "16px" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.74rem", fontWeight: "750", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Readings</span>
                <div style={{ marginTop: "6px" }}>
                  <strong style={{ fontSize: "1.45rem", fontWeight: "850", color: "var(--navy)", letterSpacing: "-0.02em" }}>{activeStats.count}</strong>
                  <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: "700", marginLeft: "6px" }}>recorded measurements</span>
                </div>
              </div>

              {/* Metric 6: Trend Direction */}
              <div style={{ background: "#f8fafc", border: "1px solid #eef2f6", borderRadius: "10px", padding: "16px" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.74rem", fontWeight: "750", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trend Direction</span>
                <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    fontSize: "1.45rem",
                    fontWeight: "900",
                    color: getTrendColor(activeStats.trendDirection),
                  }}>
                    {getTrendIcon(activeStats.trendDirection)}
                  </span>
                  <strong style={{ fontSize: "1.45rem", fontWeight: "850", color: getTrendColor(activeStats.trendDirection) }}>
                    {activeStats.trendDirection}
                  </strong>
                </div>
              </div>

            </div>

            {/* Reading Consistency Panel */}
            <div
              style={{
                border: `1px solid ${consistencyInfo.level === "No Data" ? "var(--line)" : (consistencyInfo.level === "High Consistency" ? "#99f6e4" : (consistencyInfo.level === "Moderate Consistency" ? "#fef08a" : "#feb2b2"))}`,
                background: consistencyInfo.level === "No Data" ? "#f8fafc" : (consistencyInfo.level === "High Consistency" ? "#f0fdfa" : (consistencyInfo.level === "Moderate Consistency" ? "#fffbeb" : "#fff5f5")),
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ color: "var(--navy)", fontSize: "0.88rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.03em" }}>Reading Consistency</span>
                <span style={{
                  padding: "4px 10px",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: "850",
                  letterSpacing: "0.05em",
                  color: "#fff",
                  background: consistencyInfo.color,
                }}>
                  {consistencyInfo.level.toUpperCase()}
                </span>
              </div>

              <p style={{ margin: "0 0 16px 0", color: "var(--navy)", fontSize: "0.86rem", lineHeight: "1.45", opacity: 0.9 }}>
                {consistencyInfo.description}
              </p>

              {/* Progress Bar */}
              <div style={{ background: "#e2e8f0", borderRadius: "999px", height: "8px", overflow: "hidden", width: "100%" }}>
                <div
                  style={{
                    background: consistencyInfo.color,
                    height: "100%",
                    width: `${consistencyInfo.percentage}%`,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};

export default HealthSummary;
