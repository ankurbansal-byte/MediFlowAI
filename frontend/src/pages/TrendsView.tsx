import React from "react";
import HealthSummary from "../components/HealthSummary";
import TrendChart from "../components/TrendChart";
import { type TrendRecord, type TrendPeriod } from "../components/TrendChart";
import { type HealthParameter } from "../hooks/useTrendData";

interface TrendsViewProps {
  trends: Record<HealthParameter, TrendRecord[]>;
  selectedParameter: HealthParameter;
  setSelectedParameter: (param: HealthParameter) => void;
  trendPeriod: TrendPeriod;
  setTrendPeriod: (period: TrendPeriod) => void;
  isTrendLoading: boolean;
  hasTrendError: boolean;
  trend: TrendRecord[];
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
}) => {
  return (
    <>
      <div className="trends-header" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--line)", marginBottom: "28px" }}>
        <p className="summary-section__eyebrow" style={{ margin: 0, color: "#238b82", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Analytics Workspace</p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.03em" }}>Clinical Trends & Historical Data</h1>
        <p style={{ margin: "6px 0 0 0", color: "var(--muted)", fontSize: "0.95rem" }}>
          In-depth physiological telemetry visualizer and reading consistency reporting engine.
        </p>
      </div>

      <HealthSummary
        trends={trends}
        selectedParameter={selectedParameter}
        setSelectedParameter={setSelectedParameter}
        period={trendPeriod}
        isLoading={isTrendLoading}
      />

      <div style={{ marginTop: "40px" }}>
        <TrendChart
          hasError={hasTrendError}
          isLoading={isTrendLoading}
          onPeriodChange={setTrendPeriod}
          period={trendPeriod}
          records={trend}
          parameter={selectedParameter}
        />
      </div>
    </>
  );
};

export default TrendsView;
