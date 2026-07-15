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
        ? "remained clinically stable with minimal blood pressure fluctuations"
        : sysDiff > 0
          ? `demonstrated an upward shift of ${Math.round(sysDiff)} mmHg in systolic pressure`
          : `demonstrated a downward shift of ${Math.round(Math.abs(sysDiff))} mmHg in systolic pressure`;

      let averageInterpretation = "within typical homeostatic cardiovascular ranges";
      let alertLevel: "normal" | "warning" | "alert" = "normal";

      if (avgSys >= 140 || avgDia >= 90) {
        averageInterpretation = "indicates clinical hypertension range; review antihypertensive therapy";
        alertLevel = "alert";
      } else if (avgSys >= 130 || avgDia >= 80) {
        averageInterpretation = "indicates prehypertension range; recommend sodium restriction and cardiovascular monitoring";
        alertLevel = "warning";
      } else if (avgSys < 90 || avgDia < 60) {
        averageInterpretation = "indicates hypotension risk; evaluate hydration and drug dosage";
        alertLevel = "warning";
      }

      const sysRange = maxSys - minSys;
      const diaRange = maxDia - minDia;
      let variabilityText = "low blood pressure variability, showing stable circulatory compliance";
      if (sysRange > 30 || diaRange > 20) {
        variabilityText = "high arterial pressure variability; suggest lifestyle modification and serial monitoring";
      } else if (sysRange > 15 || diaRange > 10) {
        variabilityText = "moderate arterial pressure fluctuations; suggest keeping a detailed log of medication timing";
      }

      const adviceText = "Advise patient to limit dietary sodium intake, maintain steady hydration, and log blood pressure twice daily before taking medications.";

      return {
        title1: "1. Current Status & Blood Pressure Range",
        content1: `The patient's latest blood pressure reading was measured at ${latestSys}/${latestDia} mmHg on ${latestDate}. Within the selected period, systolic values ranged from a minimum of ${minSys} to a peak of ${maxSys} mmHg, while diastolic values ranged from ${minDia} to ${maxDia} mmHg.`,
        title2: "2. Cardiovascular Trend & Variability Analysis",
        content2: `The computed mean blood pressure is ${avgSys}/${avgDia} mmHg, which ${averageInterpretation}. Progression tracking indicates that arterial pressures have ${directionPhrase} from the initial baseline measurement. The patient shows ${variabilityText}.`,
        title3: "3. Guidance & Care Coordination",
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
        ? "remained clinically stable with minimal fluctuations"
        : difference > 0
          ? `demonstrated an upward shift of ${difference % 1 === 0 ? Math.round(difference) : difference.toFixed(1)} ${unit}`
          : `demonstrated a downward shift of ${difference % 1 === 0 ? Math.round(Math.abs(difference)) : Math.abs(difference).toFixed(1)} ${unit}`;

      let averageInterpretation = "within typical homeostatic ranges";
      let alertLevel: "normal" | "warning" | "alert" = "normal";
      let variabilityText = "low physiological variability, suggesting high therapeutic stability";
      let adviceText = "Continue consistent self-monitoring and routine clinical assessments.";

      if (parameter === "blood_sugar") {
        if (average > 140) {
          averageInterpretation = "indicates a persistent mild-to-moderate hyperglycemic profile";
          alertLevel = "warning";
        } else if (average > 200) {
          averageInterpretation = "indicates marked hyperglycemic elevation requiring therapeutic review";
          alertLevel = "alert";
        } else if (average < 70) {
          averageInterpretation = "indicates borderline hypoglycemia risk; monitor active insulin or diet";
          alertLevel = "warning";
        }

        const range = maximum - minimum;
        if (range > 100) {
          variabilityText = "high glycemic variability, which can be a predisposing factor for microvascular risks";
        } else if (range > 50) {
          variabilityText = "moderate glycemic variability; consider reviewing mealtime carbohydrate correlations";
        } else {
          variabilityText = "low glycemic variability, suggesting high therapeutic stability";
        }
        adviceText = "Review food logs to correlate glycemic spikes with carbohydrate intake. Encourage consistent self-monitoring.";
      } else if (parameter === "heart_rate") {
        if (average > 100) {
          averageInterpretation = "indicates persistent tachycardia; assess for stress, fever, dehydration, or cardiac etiology";
          alertLevel = "alert";
        } else if (average > 85) {
          averageInterpretation = "indicates elevated resting heart rate range; monitor aerobic conditioning and autonomic tone";
          alertLevel = "warning";
        } else if (average < 60) {
          averageInterpretation = "indicates bradycardia; check if secondary to athletic conditioning or medication (e.g. beta blockers)";
          alertLevel = "warning";
        }

        const range = maximum - minimum;
        if (range > 30) {
          variabilityText = "high chronotropic variability; consider running an EKG to rule out intermittent arrhythmia if symptomatic";
        } else {
          variabilityText = "appropriate chronotropic response with healthy heart rate variability";
        }
        adviceText = "Monitor pulse rate correlation with physical exertion, stress levels, and caffeinated beverages. Advise seeking immediate care if accompanied by dizziness or chest pain.";
      } else if (parameter === "body_temperature") {
        const isCelsius = unit.toLowerCase().includes("c") || average < 45;
        if (isCelsius) {
          if (average > 38.0) {
            averageInterpretation = "indicates active pyrexia/fever; screen for infectious, inflammatory, or environmental triggers";
            alertLevel = "alert";
          } else if (average > 37.2) {
            averageInterpretation = "indicates low-grade febrile status; monitor closely for onset of localized symptoms";
            alertLevel = "warning";
          } else if (average < 36.0) {
            averageInterpretation = "indicates hypothermia risk; ensure warm environmental conditions and rule out endocrine factors";
            alertLevel = "warning";
          }
        } else {
          if (average > 100.4) {
            averageInterpretation = "indicates active pyrexia/fever; screen for infectious, inflammatory, or environmental triggers";
            alertLevel = "alert";
          } else if (average > 99.0) {
            averageInterpretation = "indicates low-grade febrile status; monitor closely for onset of localized symptoms";
            alertLevel = "warning";
          } else if (average < 96.8) {
            averageInterpretation = "indicates hypothermia risk; ensure warm environmental conditions and rule out endocrine factors";
            alertLevel = "warning";
          }
        }
        variabilityText = "typical homeostatic thermoregulation with low variability";
        adviceText = "Encourage frequent temperature checks, adequate fluid intake, and resting. Check for localized signs of infection (e.g., cough, dysuria).";
      } else if (parameter === "weight") {
        const firstWeight = first.numericValue;
        const pctChange = firstWeight > 0 ? ((latestValue - firstWeight) / firstWeight) * 100 : 0;

        if (pctChange > 3) {
          averageInterpretation = "shows rapid body mass increase; evaluate for potential congestive fluid retention or metabolic changes";
          alertLevel = "warning";
        } else if (pctChange < -3) {
          averageInterpretation = "shows significant weight loss; monitor nutrition intake and lean tissue preservation";
          alertLevel = "warning";
        } else {
          averageInterpretation = "remained within highly stable clinical weight corridors";
        }
        variabilityText = "steady body mass progression with healthy baseline adherence";
        adviceText = "Encourage consistent morning weight tracking under standardized conditions (fasting, after voiding). Correlate rapid fluctuations with lower extremity edema.";
      }

      const formatVal = (val: number) => (val % 1 === 0 ? val.toString() : val.toFixed(1));

      return {
        title1: `1. Current Status & ${parameter.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Range`,
        content1: `The patient's latest ${parameter.replace(/_/g, " ")} reading was measured at ${formatVal(latestValue)} ${unit} on ${latestDate}. Within the selected period, values ranged from a minimum of ${formatVal(minimum)} ${unit} to a peak of ${formatVal(maximum)} ${unit}.`,
        title2: "2. Physiological Trend & Variability Analysis",
        content2: `The computed mean value is ${formatVal(average)} ${unit}, which ${averageInterpretation}. Progression tracking indicates that levels have ${directionPhrase} from the initial baseline measurement. The patient shows ${variabilityText}.`,
        title3: "3. Guidance & Care Coordination",
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
        <p className="ai-insights__state">Formulating clinical trend analysis...</p>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className="ai-insights ai-insights--error">
        <p className="ai-insights__state ai-insights__state--error">
          Clinical Observations are currently unavailable because trend data failed to load.
        </p>
      </section>
    );
  }

  if (!clinicalAnalysis) {
    return (
      <section className="ai-insights" aria-labelledby="ai-insights-title">
        <div className="ai-insights__heading-row">
          <div>
            <p className="summary-section__eyebrow">Clinical Intelligence Insights</p>
            <h2 className="ai-insights__heading" id="ai-insights-title">Automated Observations</h2>
          </div>
          <span className="ai-insights__badge">AI Observation</span>
        </div>
        <p className="ai-insights__state">
          No {parameter.replace(/_/g, " ")} measurements are available to formulate clinical observations for this period.
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
    <section className="ai-insights" aria-labelledby="ai-insights-title">
      <div className="ai-insights__heading-row">
        <div>
          <p className="summary-section__eyebrow">Clinical Intelligence Insights</p>
          <h2 className="ai-insights__heading" id="ai-insights-title">
            ✦ Clinical Observations Progress Note
          </h2>
        </div>
        <span className={`ai-insights__badge ai-insights__badge--status-${alertLevel}`}>
          Verified Model
        </span>
      </div>

      <p className="ai-insights__description">
        AI-generated clinical summary based on {readingCount} recorded {unit} measurements.
      </p>

      <div className="clinical-progress-note">
        <div className="clinical-section">
          <h4 className="clinical-section__title">{title1}</h4>
          <p className="clinical-section__content">{content1}</p>
        </div>

        <div className="clinical-section">
          <h4 className="clinical-section__title">{title2}</h4>
          <p className="clinical-section__content">{content2}</p>
        </div>

        <div className="clinical-section">
          <h4 className="clinical-section__title">{title3}</h4>
          <p className="clinical-section__content">{content3}</p>
        </div>

        <div className="clinical-progress-note__footer">
          <span className="clinical-disclaimer">
            <strong>ADVISORY NOTE:</strong> This analysis is dynamically calculated using a rules-based model and is intended solely for clinical decision support. It does not replace independent professional medical judgment or direct clinical assessment.
          </span>
        </div>
      </div>
    </section>
  );
};

export default AIInsights;
