import { useMemo } from "react";
import { formatShortDate } from "../utils/date";

export type TrendPeriod = 7 | 30;

export type TrendRecord = {
  value: string | number;
  unit?: string;
  recordedAt?: string;
};

type TrendChartProps = {
  records: TrendRecord[];
  period: TrendPeriod;
  onPeriodChange: (period: TrendPeriod) => void;
  isLoading: boolean;
  hasError: boolean;
};

const chartWidth = 720;
const chartHeight = 260;
const padding = { top: 26, right: 26, bottom: 38, left: 54 };

const TrendChart = ({ records, period, onPeriodChange, isLoading, hasError }: TrendChartProps) => {
  const data = useMemo(() => {
    return records
      .map((record) => ({ ...record, numericValue: Number(record.value) }))
      .filter((record) => Number.isFinite(record.numericValue));
  }, [records]);

  const { latest, average, minimum, maximum, plotHeight, points, pointString, unit } = useMemo(() => {
    const values = data.map(({ numericValue }) => numericValue);
    const minVal = values.length > 0 ? Math.min(...values) : 0;
    const maxVal = values.length > 0 ? Math.max(...values) : 0;
    const rng = maxVal - minVal || 1;
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotH = chartHeight - padding.top - padding.bottom;

    const pts = data.map((record, index) => {
      const x = padding.left + (index / Math.max(data.length - 1, 1)) * plotWidth;
      const y = padding.top + (1 - (record.numericValue - minVal) / rng) * plotH;
      return { x, y, ...record };
    });

    const ptsString = pts.map(({ x, y }) => `${x},${y}`).join(" ");
    const unitSymbol = data[0]?.unit ?? "mg/dL";
    const latestVal = data.length > 0 ? data[data.length - 1].numericValue : 0;
    const avgVal = values.length > 0
      ? Number((values.reduce((total, val) => total + val, 0) / values.length).toFixed(1))
      : 0;

    return {
      latest: latestVal,
      average: avgVal,
      minimum: minVal,
      maximum: maxVal,
      plotHeight: plotH,
      points: pts,
      pointString: ptsString,
      unit: unitSymbol,
    };
  }, [data]);

  return (
    <section className="trend-section" aria-labelledby="blood-sugar-trend-title">
      <div className="trend-section__heading-row">
        <div>
          <p className="summary-section__eyebrow">Health trends</p>
          <h2 className="trend-section__heading" id="blood-sugar-trend-title">Blood sugar trend</h2>
        </div>
        <div className="trend-section__periods" aria-label="Trend period">
          {([7, 30] as TrendPeriod[]).map((days) => (
            <button
              className={`trend-section__period${period === days ? " trend-section__period--active" : ""}`}
              key={days}
              onClick={() => onPeriodChange(days)}
              type="button"
            >
              Last {days} Days
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="clinical-timeline-skeleton" style={{ marginTop: "20px" }}>
          <div className="clinical-timeline-skeleton__group" style={{ width: "35%" }} />
          <div className="clinical-timeline-skeleton__item" style={{ height: "120px" }} />
        </div>
      ) : null}
      {hasError ? (
        <div className="clinical-state-card clinical-state-card--error" style={{ marginTop: "20px" }}>
          <span className="clinical-state-card__icon" aria-hidden="true">⚠</span>
          <div className="clinical-state-card__content">
            <h3 className="clinical-state-card__title">Trend Analysis Unavailable</h3>
            <p className="clinical-state-card__message">
              The physiological trends for the selected parameters could not be constructed. Check database parameters.
            </p>
          </div>
        </div>
      ) : null}
      {!isLoading && !hasError && data.length === 0 ? (
        <div className="clinical-state-card clinical-state-card--empty" style={{ marginTop: "20px" }}>
          <span className="clinical-state-card__icon" aria-hidden="true">◈</span>
          <div className="clinical-state-card__content">
            <h3 className="clinical-state-card__title">No Trend Data</h3>
            <p className="clinical-state-card__message">
              No blood sugar recordings are available during the selected clinical period.
            </p>
          </div>
        </div>
      ) : null}
      {!isLoading && !hasError && data.length > 0 ? (
        <div className="trend-chart">
          <div className="quick-stats-grid">
            <div className="quick-stats-card">
              <span className="quick-stats-card__label">Latest</span>
              <strong className="quick-stats-card__value">
                {latest} <span className="quick-stats-card__unit">{unit}</span>
              </strong>
            </div>
            <div className="quick-stats-card">
              <span className="quick-stats-card__label">Average</span>
              <strong className="quick-stats-card__value">
                {average} <span className="quick-stats-card__unit">{unit}</span>
              </strong>
            </div>
            <div className="quick-stats-card">
              <span className="quick-stats-card__label">Highest</span>
              <strong className="quick-stats-card__value">
                {maximum} <span className="quick-stats-card__unit">{unit}</span>
              </strong>
            </div>
            <div className="quick-stats-card">
              <span className="quick-stats-card__label">Lowest</span>
              <strong className="quick-stats-card__value">
                {minimum} <span className="quick-stats-card__unit">{unit}</span>
              </strong>
            </div>
          </div>

          <svg aria-labelledby="blood-sugar-trend-title" className="trend-chart__svg" role="img" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            <line className="trend-chart__grid" x1={padding.left} x2={chartWidth - padding.right} y1={padding.top} y2={padding.top} />
            <line className="trend-chart__grid" x1={padding.left} x2={chartWidth - padding.right} y1={padding.top + plotHeight / 2} y2={padding.top + plotHeight / 2} />
            <line className="trend-chart__grid" x1={padding.left} x2={chartWidth - padding.right} y1={padding.top + plotHeight} y2={padding.top + plotHeight} />
            <text className="trend-chart__axis-label" x={8} y={padding.top + 4}>{maximum}</text>
            <text className="trend-chart__axis-label" x={8} y={padding.top + plotHeight + 4}>{minimum}</text>
            <polyline className="trend-chart__line" points={pointString} />
            {points.map((point, index) => (
              <circle className="trend-chart__point" cx={point.x} cy={point.y} key={`${point.recordedAt ?? index}-${point.value}`} r="4.5">
                <title>{`${point.value} ${point.unit ?? unit} on ${formatShortDate(point.recordedAt)}`}</title>
              </circle>
            ))}
            <text className="trend-chart__axis-label" x={padding.left} y={chartHeight - 10}>{formatShortDate(data[0]?.recordedAt)}</text>
            <text className="trend-chart__axis-label trend-chart__axis-label--end" x={chartWidth - padding.right} y={chartHeight - 10}>{formatShortDate(data[data.length - 1]?.recordedAt)}</text>
          </svg>
        </div>
      ) : null}
    </section>
  );
};

export default TrendChart;
