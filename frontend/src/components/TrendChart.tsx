import { useMemo } from "react";
import { formatShortDate } from "../utils/date";

export type TrendPeriod = 7 | 30 | 90 | 365 | 36500;

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
  parameter: string;
};

const chartWidth = 720;
const chartHeight = 260;
const padding = { top: 26, right: 26, bottom: 38, left: 54 };

interface BPRecord extends TrendRecord {
  sys: number;
  dia: number;
}

const formatParameterTitle = (parameter: string) => {
  switch (parameter) {
    case "blood_sugar":
      return "Blood Sugar Trend";
    case "blood_pressure":
      return "Blood Pressure Trend (Systolic & Diastolic)";
    case "heart_rate":
      return "Heart Rate Trend";
    case "body_temperature":
      return "Body Temperature Trend";
    case "weight":
      return "Weight Trend";
    default:
      return `${parameter.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Trend`;
  }
};

const TrendChart = ({ records, period, onPeriodChange, isLoading, hasError, parameter }: TrendChartProps) => {
  const isBP = parameter === "blood_pressure";

  const bpData = useMemo(() => {
    if (!isBP) return [];
    return records
      .map((record) => {
        const parts = String(record.value).split("/");
        if (parts.length === 2) {
          const sys = Number(parts[0].trim());
          const dia = Number(parts[1].trim());
          if (!isNaN(sys) && !isNaN(dia)) {
            return { ...record, sys, dia };
          }
        }
        return null;
      })
      .filter((record): record is BPRecord => record !== null);
  }, [records, isBP]);

  const numericData = useMemo(() => {
    if (isBP) return [];
    return records
      .map((record) => ({ ...record, numericValue: Number(record.value) }))
      .filter((record) => Number.isFinite(record.numericValue));
  }, [records, isBP]);

  const { latest, average, minimum, maximum, plotHeight, points, pointString, bpPoints, unit } = useMemo(() => {
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotH = chartHeight - padding.top - padding.bottom;

    if (isBP) {
      const sysValues = bpData.map((d) => d.sys);
      const diaValues = bpData.map((d) => d.dia);
      const allBPValues = [...sysValues, ...diaValues];

      const minVal = allBPValues.length > 0 ? Math.min(...allBPValues) : 0;
      const maxVal = allBPValues.length > 0 ? Math.max(...allBPValues) : 120;
      const rng = maxVal - minVal || 1;

      const sysPts = bpData.map((record, index) => {
        const x = padding.left + (index / Math.max(bpData.length - 1, 1)) * plotWidth;
        const y = padding.top + (1 - (record.sys - minVal) / rng) * plotH;
        return { x, y, value: record.sys, recordedAt: record.recordedAt };
      });

      const diaPts = bpData.map((record, index) => {
        const x = padding.left + (index / Math.max(bpData.length - 1, 1)) * plotWidth;
        const y = padding.top + (1 - (record.dia - minVal) / rng) * plotH;
        return { x, y, value: record.dia, recordedAt: record.recordedAt };
      });

      const sysPtsString = sysPts.map(({ x, y }) => `${x},${y}`).join(" ");
      const diaPtsString = diaPts.map(({ x, y }) => `${x},${y}`).join(" ");

      const latestVal = bpData.length > 0 ? `${bpData[bpData.length - 1].sys}/${bpData[bpData.length - 1].dia}` : "—";
      const avgSys = sysValues.length > 0 ? Math.round(sysValues.reduce((s, v) => s + v, 0) / sysValues.length) : 0;
      const avgDia = diaValues.length > 0 ? Math.round(diaValues.reduce((s, v) => s + v, 0) / diaValues.length) : 0;

      return {
        latest: latestVal,
        average: `${avgSys}/${avgDia}`,
        minimum: minVal,
        maximum: maxVal,
        plotHeight: plotH,
        points: [] as { x: number; y: number; value: string | number; unit?: string; recordedAt?: string }[],
        pointString: "",
        bpPoints: {
          sysPts,
          diaPts,
          sysPtsString,
          diaPtsString,
        },
        unit: "mmHg",
      };
    } else {
      const values = numericData.map(({ numericValue }) => numericValue);
      const minVal = values.length > 0 ? Math.min(...values) : 0;
      const maxVal = values.length > 0 ? Math.max(...values) : 0;
      const rng = maxVal - minVal || 1;

      const pts = numericData.map((record, index) => {
        const x = padding.left + (index / Math.max(numericData.length - 1, 1)) * plotWidth;
        const y = padding.top + (1 - (record.numericValue - minVal) / rng) * plotH;
        return { x, y, value: record.value, unit: record.unit, recordedAt: record.recordedAt };
      });

      const ptsString = pts.map(({ x, y }) => `${x},${y}`).join(" ");
      const unitSymbol = numericData[0]?.unit ?? (
        parameter === "blood_sugar" ? "mg/dL" :
        parameter === "heart_rate" ? "bpm" :
        parameter === "body_temperature" ? "°C" :
        parameter === "weight" ? "kg" : ""
      );

      const latestVal = numericData.length > 0 ? numericData[numericData.length - 1].numericValue : 0;
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
        bpPoints: null,
        unit: unitSymbol,
      };
    }
  }, [bpData, numericData, isBP, parameter]);

  return (
    <section className="trend-section" aria-labelledby="clinical-trend-title">
      <div className="trend-section__heading-row">
        <div>
          <p className="summary-section__eyebrow">Health trends</p>
          <h2 className="trend-section__heading" id="clinical-trend-title">
            {formatParameterTitle(parameter)}
          </h2>
        </div>
        <div className="trend-section__periods" aria-label="Trend period">
          {([7, 30, 90, 365, 36500] as TrendPeriod[]).map((days) => (
            <button
              className={`trend-section__period${period === days ? " trend-section__period--active" : ""}`}
              key={days}
              onClick={() => onPeriodChange(days)}
              type="button"
            >
              {days === 36500 ? "All" : days === 365 ? "1 Year" : days === 90 ? "3 Months" : `Last ${days} Days`}
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
      {!isLoading && !hasError && records.length === 0 ? (
        <div className="clinical-state-card clinical-state-card--empty" style={{ marginTop: "20px" }}>
          <span className="clinical-state-card__icon" aria-hidden="true">◈</span>
          <div className="clinical-state-card__content">
            <h3 className="clinical-state-card__title">No Trend Data</h3>
            <p className="clinical-state-card__message">
              No {parameter.replace(/_/g, " ")} recordings are available during the selected clinical period.
            </p>
          </div>
        </div>
      ) : null}
      {!isLoading && !hasError && records.length > 0 ? (
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

          {isBP && (
            <div style={{ display: "flex", gap: "16px", marginBottom: "16px", fontSize: "0.8rem", fontWeight: "650" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "50%", background: "#c84d64" }} />
                Systolic Pressure
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "50%", background: "#7556ce" }} />
                Diastolic Pressure
              </span>
            </div>
          )}

          <svg aria-labelledby="clinical-trend-title" className="trend-chart__svg" role="img" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            <line className="trend-chart__grid" x1={padding.left} x2={chartWidth - padding.right} y1={padding.top} y2={padding.top} />
            <line className="trend-chart__grid" x1={padding.left} x2={chartWidth - padding.right} y1={padding.top + plotHeight / 2} y2={padding.top + plotHeight / 2} />
            <line className="trend-chart__grid" x1={padding.left} x2={chartWidth - padding.right} y1={padding.top + plotHeight} y2={padding.top + plotHeight} />
            <text className="trend-chart__axis-label" x={8} y={padding.top + 4}>{maximum}</text>
            <text className="trend-chart__axis-label" x={8} y={padding.top + plotHeight + 4}>{minimum}</text>

            {isBP && bpPoints ? (
              <>
                <polyline className="trend-chart__line" points={bpPoints.sysPtsString} style={{ stroke: "#c84d64" }} />
                <polyline className="trend-chart__line" points={bpPoints.diaPtsString} style={{ stroke: "#7556ce" }} />
                {bpPoints.sysPts.map((point, index) => (
                  <circle className="trend-chart__point" cx={point.x} cy={point.y} key={`sys-${point.recordedAt ?? index}`} r="4.5" style={{ stroke: "#c84d64" }}>
                    <title>{`Systolic: ${point.value} mmHg on ${formatShortDate(point.recordedAt)}`}</title>
                  </circle>
                ))}
                {bpPoints.diaPts.map((point, index) => (
                  <circle className="trend-chart__point" cx={point.x} cy={point.y} key={`dia-${point.recordedAt ?? index}`} r="4.5" style={{ stroke: "#7556ce" }}>
                    <title>{`Diastolic: ${point.value} mmHg on ${formatShortDate(point.recordedAt)}`}</title>
                  </circle>
                ))}
              </>
            ) : (
              <>
                <polyline className="trend-chart__line" points={pointString} />
                {points.map((point, index) => (
                  <circle className="trend-chart__point" cx={point.x} cy={point.y} key={`${point.recordedAt ?? index}-${point.value}`} r="4.5">
                    <title>{`${point.value} ${point.unit ?? unit} on ${formatShortDate(point.recordedAt)}`}</title>
                  </circle>
                ))}
              </>
            )}

            <text className="trend-chart__axis-label" x={padding.left} y={chartHeight - 10}>{formatShortDate(records[0]?.recordedAt)}</text>
            <text className="trend-chart__axis-label trend-chart__axis-label--end" x={chartWidth - padding.right} y={chartHeight - 10}>{formatShortDate(records[records.length - 1]?.recordedAt)}</text>
          </svg>
        </div>
      ) : null}
    </section>
  );
};

export default TrendChart;
