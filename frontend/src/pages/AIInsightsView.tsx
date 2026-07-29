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
        <p className="summary-section__eyebrow" style={{ margin: 0, color: "var(--color-brand-primary)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Personalized Guidance</p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy)", fontSize: "1.6rem", fontWeight: 600, letterSpacing: "-0.02em" }}>Health Insights</h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
          Understand your physiological trends, review changes over time, and prepare talking points for your doctor.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        {/* Parameter Selector for AI Insights */}
        <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
          <h3 style={{ margin: "0 0 14px 0", color: "var(--navy)", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Select a Vital Metric to View Insights
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
                    borderRadius: "var(--radius-md)",
                    border: isSelected ? "2px solid var(--color-brand-primary)" : "1px solid var(--color-border)",
                    background: isSelected ? "var(--color-brand-bg-subtle)" : "transparent",
                    color: isSelected ? "var(--color-brand-primary)" : "var(--color-text-secondary)",
                    fontWeight: isSelected ? "600" : "500",
                    fontSize: "0.85rem",
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
