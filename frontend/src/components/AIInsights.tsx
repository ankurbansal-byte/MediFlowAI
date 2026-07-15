import { useMemo } from "react";
import { type TrendRecord } from "./TrendChart";
import { formatShortDate } from "../utils/date";

type AIInsightsProps = {
  records: TrendRecord[];
  isLoading: boolean;
  hasError: boolean;
};

type Reading = TrendRecord & {
  numericValue: number;
  index: number;
};

const AIInsights = ({ records, isLoading, hasError }: AIInsightsProps) => {
  const readings = useMemo(() => {
    return records
      .map((record, index) => ({ ...record, index, numericValue: Number(record.value) }))
      .filter((record): record is Reading => Number.isFinite(record.numericValue))
      .sort((first, second) => {
        const firstTime = first.recordedAt ? Date.parse(first.recordedAt) : first.index;
        const secondTime = second.recordedAt ? Date.parse(second.recordedAt) : second.index;
        return firstTime - secondTime;
      });
  }, [records]);

  const clinicalAnalysis = useMemo(() => {
    if (readings.length === 0) return null;

    const values = readings.map(({ numericValue }) => numericValue);
    const latest = readings[readings.length - 1];
    const first = readings[0];
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const average = values.reduce((total, value) => total + value, 0) / values.length;
    const unit = latest.unit ?? "mg/dL";
    const difference = latest.numericValue - first.numericValue;

    // Direction and glycemic terminology translation
    const directionPhrase = Math.abs(difference) < 5
      ? "remained clinically stable with minimal fluctuations"
      : difference > 0
        ? `demonstrated an upward shift of ${Math.round(difference)} ${unit}`
        : `demonstrated a downward shift of ${Math.round(Math.abs(difference))} ${unit}`;

    // Glycemic interpretation based on average
    let averageInterpretation = "within typical homeostatic ranges";
    let alertLevel: "normal" | "warning" | "alert" = "normal";
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

    // Variability interpretation
    const range = maximum - minimum;
    let variabilityText = "low glycemic variability, suggesting high therapeutic stability";
    if (range > 100) {
      variabilityText = "high glycemic variability, which can be a predisposing factor for microvascular risks";
    } else if (range > 50) {
      variabilityText = "moderate glycemic variability; consider reviewing mealtime carbohydrate correlations";
    }

    return {
      latestValue: latest.numericValue,
      latestDate: formatShortDate(latest.recordedAt, "the latest recorded reading"),
      average: average.toFixed(1),
      minimum,
      maximum,
      unit,
      directionPhrase,
      averageInterpretation,
      variabilityText,
      alertLevel,
      readingCount: readings.length,
    };
  }, [readings]);

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
          No blood sugar measurements are available to formulate clinical observations for this period.
        </p>
      </section>
    );
  }

  const {
    latestValue,
    latestDate,
    average,
    minimum,
    maximum,
    unit,
    directionPhrase,
    averageInterpretation,
    variabilityText,
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
          <h4 className="clinical-section__title">1. Current Status & Glycemic Range</h4>
          <p className="clinical-section__content">
            The patient&apos;s latest blood sugar reading was measured at{" "}
            <strong>
              {latestValue} {unit}
            </strong>{" "}
            on {latestDate}. Within the selected period, glucose values ranged from a minimum of{" "}
            <strong>
              {minimum} {unit}
            </strong>{" "}
            to a peak of{" "}
            <strong>
              {maximum} {unit}
            </strong>
            .
          </p>
        </div>

        <div className="clinical-section">
          <h4 className="clinical-section__title">2. Metabolic Trend & Variability Analysis</h4>
          <p className="clinical-section__content">
            The computed mean value is{" "}
            <strong>
              {average} {unit}
            </strong>
            , which {averageInterpretation}. Progression tracking indicates that glucose levels have{" "}
            {directionPhrase} from the initial baseline measurement. The patient shows {variabilityText}.
          </p>
        </div>

        <div className="clinical-section">
          <h4 className="clinical-section__title">3. Guidance & Care Coordination</h4>
          <p className="clinical-section__content">
            Review food logs to correlate glycemic spikes with carbohydrate intake. Encourage
            consistent self-monitoring.
          </p>
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
