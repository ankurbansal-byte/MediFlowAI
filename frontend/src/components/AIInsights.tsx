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

  const observations = useMemo(() => {
    if (readings.length === 0) return [];

    const values = readings.map(({ numericValue }) => numericValue);
    const latest = readings[readings.length - 1];
    const first = readings[0];
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const average = values.reduce((total, value) => total + value, 0) / values.length;
    const unit = latest.unit ?? "mg/dL";
    const difference = latest.numericValue - first.numericValue;
    const direction = Math.abs(difference) < 5
      ? "remained relatively stable"
      : difference > 0
        ? `increased by ${Math.round(difference)} ${unit}`
        : `decreased by ${Math.round(Math.abs(difference))} ${unit}`;

    return [
      `The latest blood sugar reading was ${latest.numericValue} ${unit} on ${formatShortDate(latest.recordedAt, "the latest recorded reading")}.`,
      `The average across ${readings.length} recorded reading${readings.length === 1 ? "" : "s"} was ${average.toFixed(1)} ${unit}.`,
      `Recorded values ranged from ${minimum} to ${maximum} ${unit} during this period.`,
      readings.length === 1
        ? "Only one reading is available, so a change over time cannot yet be determined."
        : `From the first to latest reading, the value ${direction}.`,
    ];
  }, [readings]);

  if (isLoading) {
    return <section className="ai-insights"><p className="ai-insights__state">Preparing trend observations...</p></section>;
  }

  if (hasError) {
    return <section className="ai-insights"><p className="ai-insights__state ai-insights__state--error">Insights are unavailable because blood sugar data could not be loaded.</p></section>;
  }

  if (readings.length === 0) {
    return (
      <section className="ai-insights" aria-labelledby="ai-insights-title">
        <div className="ai-insights__heading-row">
          <div>
            <p className="summary-section__eyebrow">Data observations</p>
            <h2 className="ai-insights__heading" id="ai-insights-title">AI insights</h2>
          </div>
          <span className="ai-insights__badge">Rule-based</span>
        </div>
        <p className="ai-insights__state">No blood sugar data is available to generate observations for this period.</p>
      </section>
    );
  }

  return (
    <section className="ai-insights" aria-labelledby="ai-insights-title">
      <div className="ai-insights__heading-row">
        <div>
          <p className="summary-section__eyebrow">Data observations</p>
          <h2 className="ai-insights__heading" id="ai-insights-title">AI insights</h2>
        </div>
        <span className="ai-insights__badge">Rule-based</span>
      </div>
      <p className="ai-insights__description">Automated observations based on recorded blood sugar values. This is not clinical advice.</p>
      <ul className="ai-insights__list">
        {observations.map((observation) => <li key={observation}>{observation}</li>)}
      </ul>
    </section>
  );
};

export default AIInsights;
