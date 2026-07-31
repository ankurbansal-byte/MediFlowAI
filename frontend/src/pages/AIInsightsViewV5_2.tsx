import React, { useMemo } from "react";
import { type TrendRecord } from "../components/TrendChart";
import { type HealthParameter } from "../hooks/useTrendData";
import { formatShortDate } from "../utils/date";

// Import project assets naturally with standard .png extension to blend into the storytelling
import doctorDashboard from "../assets/images/doctor-dashboard.png";
import cloudPlatformFlow from "../assets/images/cloud-platform-flow.png";

import "./AIInsightsViewV5_2.css";

interface AIInsightsViewV5_2Props {
  trends: Record<HealthParameter, TrendRecord[]>;
  selectedParameter: HealthParameter;
  setSelectedParameter: (param: HealthParameter) => void;
  isTrendLoading: boolean;
  hasTrendError: boolean;
  trend: TrendRecord[];
}

const parameterConfigs: Record<
  HealthParameter,
  { label: string; icon: string; tint: string; border: string; text: string; iconBg: string; iconBorder: string }
> = {
  blood_sugar: { label: "Blood Sugar", icon: "🩸", tint: "#FFFBF7", border: "#FEEADB", text: "var(--v52-orange)", iconBg: "rgba(255,122,0,0.12)", iconBorder: "#FFE5CC" },
  blood_pressure: { label: "Blood Pressure", icon: "🩺", tint: "#F0F9FF", border: "#E0F2FE", text: "var(--v52-blue)", iconBg: "rgba(14,165,233,0.12)", iconBorder: "#BAE6FD" },
  heart_rate: { label: "Heart Rate", icon: "❤️", tint: "#FFF5F5", border: "#FFE4E6", text: "var(--v52-rose)", iconBg: "rgba(244,63,94,0.12)", iconBorder: "#FECDD3" },
  body_temperature: { label: "Temperature", icon: "🌡️", tint: "#FFFDF0", border: "#FEF9C3", text: "var(--v52-yellow)", iconBg: "rgba(234,179,8,0.12)", iconBorder: "#FEF08A" },
  weight: { label: "Weight", icon: "⚖️", tint: "#FAF5FF", border: "#F3E8FF", text: "var(--v52-purple)", iconBg: "rgba(124,58,237,0.12)", iconBorder: "#E9D5FF" },
};

const EditorialTransition: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="v52-editorial-divider-section">
      <div className="v52-editorial-line"></div>
      <p className="v52-editorial-quote-text">
        {text}
      </p>
      <div className="v52-editorial-line"></div>
    </div>
  );
};

type Reading = TrendRecord & {
  numericValue: number;
  index: number;
};

interface BPReading extends TrendRecord {
  sys: number;
  dia: number;
  index: number;
}

const AIInsightsViewV5_2: React.FC<AIInsightsViewV5_2Props> = ({
  trends,
  selectedParameter,
  setSelectedParameter,
  isTrendLoading,
  hasTrendError,
  trend,
}) => {
  const isBP = selectedParameter === "blood_pressure";

  // Data processing matching standard AIInsights precisely
  const readings = useMemo(() => {
    if (isBP) {
      return trend
        .map((record, index) => {
          const parts = String(record.value).split("/");
          if (parts.length === 2) {
            const sys = Number(parts[0].trim());
            const dia = Number(parts[1].trim());
            if (!isNaN(sys) && !isNaN(dia)) {
              return { ...record, index, sys, dia };
            }
          }
          return null;
        })
        .filter((record): record is BPReading => record !== null)
        .sort((first, second) => {
          const firstTime = first.recordedAt ? Date.parse(first.recordedAt) : first.index;
          const secondTime = second.recordedAt ? Date.parse(second.recordedAt) : second.index;
          return firstTime - secondTime;
        });
    }

    return trend
      .map((record, index) => ({ ...record, index, numericValue: Number(record.value) }))
      .filter((record): record is Reading => Number.isFinite(record.numericValue))
      .sort((first, second) => {
        const firstTime = first.recordedAt ? Date.parse(first.recordedAt) : first.index;
        const secondTime = second.recordedAt ? Date.parse(second.recordedAt) : second.index;
        return firstTime - secondTime;
      });
  }, [trend, isBP]);

  const clinicalAnalysis = useMemo(() => {
    if (readings.length === 0) return null;

    const readingCount = readings.length;

    if (isBP) {
      const bpReadings = readings as BPReading[];
      const first = bpReadings[0];
      const latest = bpReadings[bpReadings.length - 1];

      const sysValues = bpReadings.map((r) => r.sys);
      const diaValues = bpReadings.map((r) => r.dia);

      const latestSys = latest.sys;
      const latestDia = latest.dia;
      const latestDate = formatShortDate(latest.recordedAt, "the latest recorded reading");

      const minSys = Math.min(...sysValues);
      const maxSys = Math.max(...sysValues);
      const minDia = Math.min(...diaValues);
      const maxDia = Math.max(...diaValues);

      const avgSys = Math.round(sysValues.reduce((sum: number, v: number) => sum + v, 0) / bpReadings.length);
      const avgDia = Math.round(diaValues.reduce((sum: number, v: number) => sum + v, 0) / bpReadings.length);

      const sysDiff = latestSys - first.sys;

      const directionPhrase = Math.abs(sysDiff) < 5
        ? "remained stable with minimal fluctuations"
        : sysDiff > 0
          ? `demonstrated an upward shift of ${Math.round(sysDiff)} mmHg in systolic pressure`
          : `demonstrated a downward shift of ${Math.round(Math.abs(sysDiff))} mmHg in systolic pressure`;

      let averageInterpretation = "within normal typical ranges";
      let alertLevel: "normal" | "warning" | "alert" = "normal";

      if (avgSys >= 140 || avgDia >= 90) {
        averageInterpretation = "indicates a higher/elevated range; we recommend sharing this with your doctor for review";
        alertLevel = "alert";
      } else if (avgSys >= 130 || avgDia >= 80) {
        averageInterpretation = "indicates a mildly elevated range; maintaining a steady log of your blood pressure can be helpful";
        alertLevel = "warning";
      } else if (avgSys < 90 || avgDia < 60) {
        averageInterpretation = "indicates a lower range; ensure adequate hydration and discuss with your physician";
        alertLevel = "warning";
      }

      const sysRange = maxSys - minSys;
      const diaRange = maxDia - minDia;
      let variabilityText = "low blood pressure variability, showing stable trends";
      if (sysRange > 30 || diaRange > 20) {
        variabilityText = "moderate fluctuations; keeping a detailed log of when you take your readings can help identify patterns";
      } else if (sysRange > 15 || diaRange > 10) {
        variabilityText = "mild variations; suggest continuing with consistent, standardized measurements";
      }

      const adviceText = "Consider reducing dietary sodium intake, maintaining consistent daily hydration, and recording your vitals twice daily (e.g., morning and evening) before taking any medications.";

      return {
        title1: "What your recent readings show",
        content1: `Your latest blood pressure was measured at ${latestSys}/${latestDia} mmHg on ${latestDate}. Over the selected period, your systolic values ranged from a minimum of ${minSys} to a peak of ${maxSys} mmHg, and your diastolic values ranged from ${minDia} to ${maxDia} mmHg.`,
        title2: "Changes over time",
        content2: `Your average blood pressure is ${avgSys}/${avgDia} mmHg, which ${averageInterpretation}. Since your first baseline measurement, your readings have ${directionPhrase}. Currently, your data shows ${variabilityText}.`,
        title3: "Things worth discussing with your doctor",
        content3: adviceText,
        unit: "mmHg",
        alertLevel,
        readingCount,
        metrics: [
          { label: "Latest Reading", value: `${latestSys}/${latestDia} ${latest.unit || "mmHg"}` },
          { label: "Average Value", value: `${avgSys}/${avgDia} mmHg` },
          { label: "Systolic Range", value: `${minSys} – ${maxSys} mmHg` },
          { label: "Diastolic Range", value: `${minDia} – ${maxDia} mmHg` },
        ]
      };
    } else {
      const numericReadings = readings as Reading[];
      const first = numericReadings[0];
      const latest = numericReadings[numericReadings.length - 1];

      const values = numericReadings.map((r) => r.numericValue);
      const latestValue = latest.numericValue;
      const latestDate = formatShortDate(latest.recordedAt, "the latest recorded reading");
      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      const average = values.reduce((total: number, value: number) => total + value, 0) / values.length;
      const unit = latest.unit ?? (
        selectedParameter === "blood_sugar" ? "mg/dL" :
        selectedParameter === "heart_rate" ? "bpm" :
        selectedParameter === "body_temperature" ? "°C" :
        selectedParameter === "weight" ? "kg" : ""
      );

      const difference = latestValue - first.numericValue;
      const directionPhrase = Math.abs(difference) < (selectedParameter === "body_temperature" ? 0.3 : 2)
        ? "remained stable with minimal fluctuations"
        : difference > 0
          ? `demonstrated an upward shift of ${difference % 1 === 0 ? Math.round(difference) : difference.toFixed(1)} ${unit}`
          : `demonstrated a downward shift of ${difference % 1 === 0 ? Math.round(Math.abs(difference)) : Math.abs(difference).toFixed(1)} ${unit}`;

      let averageInterpretation = "within normal typical ranges";
      let alertLevel: "normal" | "warning" | "alert" = "normal";
      let variabilityText = "low variability, suggesting steady trends";
      let adviceText = "Continue consistent tracking and routine home monitoring.";

      if (selectedParameter === "blood_sugar") {
        if (average > 140) {
          averageInterpretation = "indicates mildly elevated sugar levels; consider noting your carbohydrate intake";
          alertLevel = "warning";
        } else if (average > 200) {
          averageInterpretation = "indicates significantly elevated sugar levels; we recommend discussing this trend with your clinician";
          alertLevel = "alert";
        } else if (average < 70) {
          averageInterpretation = "indicates a lower sugar level; ensure timely meals and consult your physician";
          alertLevel = "warning";
        }

        const range = maximum - minimum;
        if (range > 100) {
          variabilityText = "high glycemic variation; checking readings before and after meals can help find the cause";
        } else if (range > 50) {
          variabilityText = "moderate variations; keeping a simple food log may help clarify these trends";
        } else {
          variabilityText = "highly consistent sugar levels, demonstrating stable day-to-day trends";
        }
        adviceText = "Consider checking sugar levels under consistent conditions (e.g., fasting or exactly 2 hours post-meal) and discussing food log patterns with your doctor.";
      } else if (selectedParameter === "heart_rate") {
        if (average > 100) {
          averageInterpretation = "indicates an elevated heart rate range; evaluate if stress, hydration, or caffeine are factors";
          alertLevel = "alert";
        } else if (average > 85) {
          averageInterpretation = "indicates a slightly elevated resting heart rate; regular walking and aerobic movement can help";
          alertLevel = "warning";
        } else if (average < 60) {
          averageInterpretation = "indicates a lower heart rate; this is typical for athletic individuals but good to mention to your doctor";
          alertLevel = "warning";
        }

        const range = maximum - minimum;
        if (range > 30) {
          variabilityText = "notable heart rate variation; try to rest for 5 minutes before taking a reading to ensure accuracy";
        } else {
          variabilityText = "healthy, normal variations corresponding to routine daily activity";
        }
        adviceText = "Observe if your heart rate correlates with physical effort, stress, or caffeine. Share any feelings of fluttering or dizziness immediately with your practitioner.";
      } else if (selectedParameter === "body_temperature") {
        const isCelsius = unit.toLowerCase().includes("c") || average < 45;
        if (isCelsius) {
          if (average > 38.0) {
            averageInterpretation = "indicates an elevated temperature or active fever; ensure ample rest and hydration";
            alertLevel = "alert";
          } else if (average > 37.2) {
            averageInterpretation = "indicates a warm or low-grade temperature; monitor for any other symptoms";
            alertLevel = "warning";
          } else if (average < 36.0) {
            averageInterpretation = "indicates a slightly low temperature; keep comfortable and ensure warm surroundings";
            alertLevel = "warning";
          }
        } else {
          if (average > 100.4) {
            averageInterpretation = "indicates an elevated temperature or active fever; ensure ample rest and hydration";
            alertLevel = "alert";
          } else if (average > 99.0) {
            averageInterpretation = "indicates a warm or low-grade temperature; monitor for any other symptoms";
            alertLevel = "warning";
          } else if (average < 96.8) {
            averageInterpretation = "indicates a slightly low temperature; keep comfortable and ensure warm surroundings";
            alertLevel = "warning";
          }
        }
        variabilityText = "typical steady body temperature with normal regulation";
        adviceText = "Stay hydrated, get plenty of rest, and monitor your symptoms. Share any lingering high readings with your doctor.";
      } else if (selectedParameter === "weight") {
        const firstWeight = first.numericValue;
        const pctChange = firstWeight > 0 ? ((latestValue - firstWeight) / firstWeight) * 100 : 0;

        if (pctChange > 3) {
          averageInterpretation = "shows a rapid increase; discuss this with your doctor to rule out fluid retention or metabolic factors";
          alertLevel = "warning";
        } else if (pctChange < -3) {
          averageInterpretation = "shows notable weight loss; ensure you are meeting your nutritional needs and share this with your doctor";
          alertLevel = "warning";
        } else {
          averageInterpretation = "remained within highly stable corridors";
        }
        variabilityText = "steady weight timeline with minor typical daily variations";
        adviceText = "For maximum consistency, try weighing yourself at the same time each morning (ideally fasting, after using the restroom).";
      }

      const formatVal = (val: number) => (val % 1 === 0 ? val.toString() : val.toFixed(1));

      return {
        title1: "What your recent readings show",
        content1: `Your latest ${selectedParameter.replace(/_/g, " ")} was measured at ${formatVal(latestValue)} ${unit} on ${latestDate}. Over the selected period, your values ranged from a minimum of ${formatVal(minimum)} ${unit} to a peak of ${formatVal(maximum)} ${unit}.`,
        title2: "Changes over time",
        content2: `Your average reading is ${formatVal(average)} ${unit}, which ${averageInterpretation}. Since your first baseline measurement, your readings have ${directionPhrase}. Currently, your data shows ${variabilityText}.`,
        title3: "Things worth discussing with your doctor",
        content3: adviceText,
        unit,
        alertLevel,
        readingCount,
        metrics: [
          { label: "Latest Reading", value: `${formatVal(latestValue)} ${unit}` },
          { label: "Average Value", value: `${formatVal(average)} ${unit}` },
          { label: "Minimum Recorded", value: `${formatVal(minimum)} ${unit}` },
          { label: "Peak Value", value: `${formatVal(maximum)} ${unit}` },
        ]
      };
    }
  }, [readings, isBP, selectedParameter]);

  return (
    <div className="v52-insights-canvas">

      {/* SECTION 1: HERO SECTION WITH PREMIUM BACKGROUND */}
      <section className="v52-hero-section">
        <div className="v52-hero-grid">
          {/* Left Column: Context & Copy */}
          <div className="v52-hero-content-column">
            <span className="v52-hero-eyebrow">
              ⚡ Clinical Intelligence Hub V5.2
            </span>
            <h1 className="v52-hero-title">
              Personalized Health Insights
            </h1>
            <p className="v52-hero-body">
              Understand your physiological trends, review changes over time, and prepare structured talking points for your doctor. Just keep logging your vitals on WhatsApp to enrich your medical assessment.
            </p>
            <div className="v52-hero-whatsapp-indicator" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
              <span className="v52-whatsapp-dot" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--v5-brand-green)", boxShadow: "0 0 8px var(--v5-brand-green)" }}></span>
              <span className="v52-whatsapp-text" style={{ fontSize: "14px", fontWeight: 600, color: "var(--v5-brand-green)" }}>WhatsApp AI Insights Channel Active</span>
            </div>
            <div className="v52-hero-id-badge">
              Clinical Integrity Audited
            </div>
          </div>

          {/* Right Column: Storytelling Asset */}
          <div className="v52-hero-visual-column">
            <div className="v52-storytelling-wrapper" style={{ gridTemplateColumns: "1fr" }}>
              <div className="v52-storytelling-card">
                <span className="v52-image-tag" style={{ background: "var(--v52-purple)" }}>AI Pipeline</span>
                <img src={cloudPlatformFlow} alt="Informatics Cloud Architecture" className="v52-storytelling-image" style={{ height: "140px" }} />
                <p className="v52-image-caption">Advanced clinical text model parsing WhatsApp messages, applying strict diagnostic safety fallback warnings automatically.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: METRIC SELECTOR */}
      <section className="v52-section-panel v52-bg-summary-panel" aria-labelledby="v52-selector-heading">
        <h2 id="v52-selector-heading" className="v52-panel-heading" style={{ margin: 0 }}>
          🩺 Vital Metric Focus
        </h2>
        <p className="v52-panel-subtitle" style={{ marginTop: "4px", marginBottom: "20px" }}>
          Choose a vital parameter below to analyze its complete longitudinal timeline and retrieve clinical insights.
        </p>

        <div className="v52-metric-buttons-container">
          {(Object.keys(parameterConfigs) as HealthParameter[]).map((key) => {
            const config = parameterConfigs[key];
            const isSelected = selectedParameter === key;
            const count = trends[key]?.length ?? 0;

            return (
              <button
                key={key}
                onClick={() => setSelectedParameter(key)}
                type="button"
                className={`v52-param-tab-btn ${isSelected ? "v52-param-tab-btn--active" : ""}`}
              >
                <span className="v52-param-tab-icon" style={{ background: config.iconBg }}>
                  {config.icon}
                </span>
                <span>{config.label}</span>
                <span className="v52-param-tab-badge">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <EditorialTransition text="“Coherence is found not in a single reading, but in the slow geometry of constants over time.”" />

      {/* SECTION 3: PERSONALIZED HEALTH INSIGHTS CARD */}
      <section className="v52-section-panel v52-bg-insights-panel" aria-labelledby="v52-insights-card-heading">
        <h2 id="v52-insights-card-heading" className="v52-panel-heading">
          ✦ AI Health Assessment
        </h2>
        <p className="v52-panel-subtitle">
          Highly specialized analytical evaluation of your vital parameters tracked via secure chat pathways.
        </p>

        {isTrendLoading ? (
          <div style={{ background: "var(--v5-bg-white)", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "16px", padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontSize: "16px", color: "var(--v5-text-muted)", margin: 0 }}>
              Analyzing longitudinal timelines and formulating medical insights...
            </p>
          </div>
        ) : hasTrendError ? (
          <div style={{ background: "var(--v5-bg-white)", border: "1.5px solid var(--v52-rose)", borderRadius: "16px", padding: "48px 24px", textAlign: "center" }}>
            <span style={{ fontSize: "2rem" }}>⚠️</span>
            <p style={{ color: "var(--v52-rose)", fontWeight: 600, marginTop: "12px", margin: "12px 0 0 0" }}>
              Health insights are currently unavailable because trend data failed to load. Please check your connection and try again.
            </p>
          </div>
        ) : !clinicalAnalysis ? (
          <div style={{ background: "var(--v5-bg-white)", border: "1.5px dashed var(--v5-border-subtle)", borderRadius: "16px", padding: "56px 24px", textAlign: "center" }}>
            <span style={{ fontSize: "2.5rem" }}>📁</span>
            <p style={{ color: "var(--v5-text-muted)", fontSize: "15px", fontWeight: 500, marginTop: "12px", margin: "12px 0 0 0" }}>
              No {selectedParameter.replace(/_/g, " ")} measurements are available to formulate health insights for this period.
            </p>
            <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--v5-text-muted)", margin: "4px 0 0 0" }}>
              Logged readings will show up here as soon as you record them on WhatsApp!
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* Main Insights Panel */}
            <div className="v52-insights-panel-inner" style={{
              borderTop: `6px solid ${parameterConfigs[selectedParameter].text}`
            }}>

              {/* Header with status */}
              <div className="v52-insights-header">
                <div>
                  <span className="v52-insights-eyebrow-text" style={{ color: parameterConfigs[selectedParameter].text }}>
                    Personalized Guidance
                  </span>
                  <h3 className="v52-insights-title">
                    ✦ {parameterConfigs[selectedParameter].label} Summary
                  </h3>
                </div>

                <span className={`v52-insights-status-badge ${clinicalAnalysis.alertLevel}`}>
                  {clinicalAnalysis.alertLevel} status
                </span>
              </div>

              {/* Grid Layout: Visual Metrics (Left) and Narrative (Right) */}
              <div className="v52-insights-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>

                {/* Left Side: Fact highlight grid cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h4 style={{ fontSize: "11px", fontWeight: 700, color: "var(--v5-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Chronological Facts</h4>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {clinicalAnalysis.metrics.map((m, idx) => (
                      <div key={idx} className="v52-insights-fact-card">
                        <span className="v52-insights-fact-label">
                          {m.label}
                        </span>
                        <strong className="v52-insights-fact-value">
                          {m.value}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className="v52-insights-sampled-container">
                    <span style={{ fontSize: "20px" }}>📈</span>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span className="v52-insights-sampled-label">Total Records Sampled</span>
                      <strong className="v52-insights-sampled-value">{clinicalAnalysis.readingCount} entries</strong>
                    </div>
                  </div>
                </div>

                {/* Right Side: Narrative Sections */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                  <div className="v52-insights-narrative-primary" style={{
                    background: parameterConfigs[selectedParameter].tint,
                    border: `1.5px solid ${parameterConfigs[selectedParameter].border}`,
                    borderLeft: `5px solid ${parameterConfigs[selectedParameter].text}`,
                  }}>
                    <h5 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 600, color: "var(--v5-text-dark)" }}>
                      {clinicalAnalysis.title1}
                    </h5>
                    <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "var(--v5-text-dark)" }}>
                      {clinicalAnalysis.content1}
                    </p>
                  </div>

                  <div className="v52-insights-narrative-secondary">
                    <h5 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 600, color: "var(--v5-text-dark)" }}>
                      {clinicalAnalysis.title2}
                    </h5>
                    <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "var(--v5-text-dark)" }}>
                      {clinicalAnalysis.content2}
                    </p>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}
      </section>

      {/* SECTION 4: DOCTOR TALKING POINTS (SOFT GREEN PANEL) */}
      <section className="v52-section-panel v52-bg-labs-panel" aria-labelledby="v52-talking-heading">
        <div className="v52-labs-layout-grid">
          {/* Left panel: Info */}
          <div className="v52-labs-list-column">
            <span className="v52-labs-specimen-badge" style={{ background: "#DCFCE7", color: "#15803D" }}>
              💡 Clinical Recommendation
            </span>
            <h2 id="v52-talking-heading" className="v52-panel-heading" style={{ margin: 0 }}>
              Things worth discussing with your doctor
            </h2>
            <p className="v52-panel-subtitle" style={{ marginTop: "4px" }}>
              Practical tips and talking points structured strictly from your analytical logs to assist your clinician.
            </p>

            {clinicalAnalysis ? (
              <div className="v52-insights-doctor-panel">
                <span style={{ fontSize: "24px", marginTop: "2px" }}>🩺</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <p className="v52-insights-doctor-text">
                    {clinicalAnalysis.content3}
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ fontStyle: "italic", color: "var(--v5-text-muted)" }}>No current recommendations. Keep logging readings to generate clinical support notes.</p>
            )}
          </div>

          {/* Right panel: Doctor dashboard storytelling image */}
          <div className="v52-labs-visual-column">
            <div className="v52-storytelling-card">
              <span className="v52-image-tag" style={{ background: "var(--v52-teal)" }}>Practitioner View</span>
              <img src={doctorDashboard} alt="Physician Telemetry View" className="v52-storytelling-image" />
              <p className="v52-image-caption">Clinical dashboard transmitting daily physiological trends securely to your doctor's office in real time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Advisory Note Footer */}
      <div className="v52-insights-disclaimer-note">
        ⚠️ <strong>Clinical Advisory Disclaimer:</strong> Automated analysis is strictly calculated using a rule-based algorithm and is intended for care coordination and personal support only. It does not replace clinical consultation, professional diagnosis, or prescriptive medical advice.
      </div>

    </div>
  );
};

export default AIInsightsViewV5_2;
