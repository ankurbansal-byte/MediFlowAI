import { useMemo } from "react";
import { type TrendRecord } from "./TrendChart";
import { formatShortDate } from "../utils/date";

type AIInsightsProps = {
  records: TrendRecord[];
  isLoading: boolean;
  hasError: boolean;
  parameter: string;
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

const AIInsights = ({ records, isLoading, hasError, parameter }: AIInsightsProps) => {
  const isBP = parameter === "blood_pressure";

  const readings = useMemo(() => {
    if (isBP) {
      return records
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

    return records
      .map((record, index) => ({ ...record, index, numericValue: Number(record.value) }))
      .filter((record): record is Reading => Number.isFinite(record.numericValue))
      .sort((first, second) => {
        const firstTime = first.recordedAt ? Date.parse(first.recordedAt) : first.index;
        const secondTime = second.recordedAt ? Date.parse(second.recordedAt) : second.index;
        return firstTime - secondTime;
      });
  }, [records, isBP]);

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
        parameter === "blood_sugar" ? "mg/dL" :
        parameter === "heart_rate" ? "bpm" :
        parameter === "body_temperature" ? "°C" :
        parameter === "weight" ? "kg" : ""
      );

      const difference = latestValue - first.numericValue;
      const directionPhrase = Math.abs(difference) < (parameter === "body_temperature" ? 0.3 : 2)
        ? "remained stable with minimal fluctuations"
        : difference > 0
          ? `demonstrated an upward shift of ${difference % 1 === 0 ? Math.round(difference) : difference.toFixed(1)} ${unit}`
          : `demonstrated a downward shift of ${difference % 1 === 0 ? Math.round(Math.abs(difference)) : Math.abs(difference).toFixed(1)} ${unit}`;

      let averageInterpretation = "within normal typical ranges";
      let alertLevel: "normal" | "warning" | "alert" = "normal";
      let variabilityText = "low variability, suggesting steady trends";
      let adviceText = "Continue consistent tracking and routine home monitoring.";

      if (parameter === "blood_sugar") {
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
      } else if (parameter === "heart_rate") {
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
      } else if (parameter === "body_temperature") {
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
      } else if (parameter === "weight") {
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
        content1: `Your latest ${parameter.replace(/_/g, " ")} was measured at ${formatVal(latestValue)} ${unit} on ${latestDate}. Over the selected period, your values ranged from a minimum of ${formatVal(minimum)} ${unit} to a peak of ${formatVal(maximum)} ${unit}.`,
        title2: "Changes over time",
        content2: `Your average reading is ${formatVal(average)} ${unit}, which ${averageInterpretation}. Since your first baseline measurement, your readings have ${directionPhrase}. Currently, your data shows ${variabilityText}.`,
        title3: "Things worth discussing with your doctor",
        content3: adviceText,
        unit,
        alertLevel,
        readingCount,
      };
    }
  }, [readings, isBP, parameter]);

  if (isLoading) {
    return (
      <section className="ai-insights ai-insights--loading">
        <p className="ai-insights__state">Formulating personalized insights...</p>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className="ai-insights ai-insights--error">
        <p className="ai-insights__state ai-insights__state--error">
          Health insights are currently unavailable because trend data failed to load.
        </p>
      </section>
    );
  }

  if (!clinicalAnalysis) {
    return (
      <section className="ai-insights" aria-labelledby="ai-insights-title">
        <div className="ai-insights__heading-row">
          <div>
            <p className="summary-section__eyebrow">Personalized Insights</p>
            <h2 className="ai-insights__heading" id="ai-insights-title">Health Insights</h2>
          </div>
        </div>
        <p className="ai-insights__state" style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>
          No {parameter.replace(/_/g, " ")} measurements are available to formulate health insights for this period.
        </p>
      </section>
    );
  }

  const {
    title1,
    content1,
    title2,
    content2,
    title3,
    content3,
    unit,
    alertLevel,
    readingCount,
  } = clinicalAnalysis;

  return (
    <section className="ai-insights" aria-labelledby="ai-insights-title" style={{
      background: "var(--color-bg-card)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)",
      padding: "24px",
      boxShadow: "var(--shadow-sm)"
    }}>
      <div className="ai-insights__heading-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
        <div>
          <p className="summary-section__eyebrow" style={{ margin: 0, color: "var(--color-brand-primary)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Personalized Insights</p>
          <h2 className="ai-insights__heading" id="ai-insights-title" style={{ margin: "4px 0 0 0", color: "var(--color-text-primary)", fontSize: "1.15rem", fontWeight: 600 }}>
            ✦ Health Insights
          </h2>
        </div>
        <span className={`ai-insights__badge ai-insights__badge--status-${alertLevel}`} style={{
          fontSize: "0.72rem",
          fontWeight: 600,
          textTransform: "uppercase",
          padding: "4px 10px",
          borderRadius: "var(--radius-full)",
          background: alertLevel === "normal" ? "var(--color-success-bg)" : alertLevel === "warning" ? "var(--color-warning-bg)" : "var(--color-error-bg)",
          color: alertLevel === "normal" ? "var(--color-brand-primary)" : alertLevel === "warning" ? "var(--color-warning)" : "var(--color-error)"
        }}>
          {alertLevel} status
        </span>
      </div>

      <p className="ai-insights__description" style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", margin: "0 0 20px 0" }}>
        Automated summary based on {readingCount} recorded {unit} measurements.
      </p>

      <div className="clinical-progress-note" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="clinical-section" style={{ borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "16px" }}>
          <h4 className="clinical-section__title" style={{ margin: "0 0 6px 0", color: "var(--color-text-primary)", fontSize: "0.92rem", fontWeight: 600 }}>{title1}</h4>
          <p className="clinical-section__content" style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.88rem", lineHeight: "1.5" }}>{content1}</p>
        </div>

        <div className="clinical-section" style={{ borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "16px" }}>
          <h4 className="clinical-section__title" style={{ margin: "0 0 6px 0", color: "var(--color-text-primary)", fontSize: "0.92rem", fontWeight: 600 }}>{title2}</h4>
          <p className="clinical-section__content" style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.88rem", lineHeight: "1.5" }}>{content2}</p>
        </div>

        <div className="clinical-section" style={{ borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "16px" }}>
          <h4 className="clinical-section__title" style={{ margin: "0 0 6px 0", color: "var(--color-text-primary)", fontSize: "0.92rem", fontWeight: 600 }}>{title3}</h4>
          <p className="clinical-section__content" style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.88rem", lineHeight: "1.5" }}>{content3}</p>
        </div>

        <div className="clinical-progress-note__footer" style={{ marginTop: "8px" }}>
          <span className="clinical-disclaimer" style={{ display: "block", padding: "10px 14px", background: "var(--color-border-subtle)", borderLeft: "3px solid var(--color-brand-primary)", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0", fontSize: "0.74rem", color: "var(--color-text-secondary)", lineHeight: "1.4" }}>
            <strong>ADVISORY NOTE:</strong> This analysis is calculated using a rule-based system and is intended solely for personal information support and care coordination. It does not replace independent professional medical advice, diagnosis, or direct clinical assessment.
          </span>
        </div>
      </div>
    </section>
  );
};

export default AIInsights;
