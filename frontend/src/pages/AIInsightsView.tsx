import React from "react";
import AIInsights from "../components/AIInsights";
import { type TrendRecord } from "../components/TrendChart";
import { type HealthParameter } from "../hooks/useTrendData";

interface AIInsightsViewProps {
  trends: Record<HealthParameter, TrendRecord[]>;
  selectedParameter: HealthParameter;
  setSelectedParameter: (param: HealthParameter) => void;
  isTrendLoading: boolean;
  hasTrendError: boolean;
  trend: TrendRecord[];
}

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

const AIInsightsView: React.FC<AIInsightsViewProps> = ({
  trends,
  selectedParameter,
  setSelectedParameter,
  isTrendLoading,
  hasTrendError,
  trend,
}) => {
  return (
    <>
      <div className="ai-insights-header" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--line)", marginBottom: "28px" }}>
        <p className="summary-section__eyebrow" style={{ margin: 0, color: "#238b82", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Clinical Intelligence</p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.03em" }}>AI Clinical Insights</h1>
        <p style={{ margin: "6px 0 0 0", color: "var(--muted)", fontSize: "0.95rem" }}>
          Dynamic physiological summaries, alerts, clinical interpretation, and care guidance.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        {/* Parameter Selector for AI Insights */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ margin: "0 0 14px 0", color: "var(--navy)", fontSize: "0.95rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Select Parameter for Observation Progress Note
          </h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {(Object.keys(parameterConfigs) as HealthParameter[]).map((key) => {
              const config = parameterConfigs[key];
              const isSelected = selectedParameter === key;
              const count = trends[key]?.length ?? 0;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedParameter(key)}
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: isSelected ? "2px solid #238b82" : "1px solid var(--line)",
                    background: isSelected ? "#e7f8f5" : "var(--surface)",
                    color: isSelected ? "#115e59" : "var(--navy)",
                    fontWeight: isSelected ? "750" : "600",
                    fontSize: "0.86rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    outline: "none",
                  }}
                >
                  <span className={`summary-card__icon--${config.accent}`} style={{ fontSize: "1rem" }}>{config.icon}</span>
                  <span>{config.label} ({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Insights Card */}
        <AIInsights
          hasError={hasTrendError}
          isLoading={isTrendLoading}
          records={trend}
          parameter={selectedParameter}
        />
      </div>
    </>
  );
};

export default AIInsightsView;
