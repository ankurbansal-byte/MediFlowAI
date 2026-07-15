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

  const { minimum, maximum, plotHeight, points, pointString, unit } = useMemo(() => {
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

    return {
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

      {isLoading ? <p className="trend-section__state">Loading blood sugar trend...</p> : null}
      {hasError ? <p className="trend-section__state trend-section__state--error">Blood sugar trend is currently unavailable.</p> : null}
      {!isLoading && !hasError && data.length === 0 ? <p className="trend-section__state">No blood sugar readings are available for this period.</p> : null}
      {!isLoading && !hasError && data.length > 0 ? (
        <div className="trend-chart">
          <div className="trend-chart__summary">
            <span>Range</span>
            <strong>{minimum}–{maximum} {unit}</strong>
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
