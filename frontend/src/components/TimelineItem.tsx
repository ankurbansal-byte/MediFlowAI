import { formatLongDate } from "../utils/date";

export type TimelineRecord = {
  parameter: string;
  value: string | number;
  unit?: string;
  recordedAt?: string;
  source?: string;
  confidence?: number;
};

type TimelineItemProps = {
  record: TimelineRecord;
};

const formatParameter = (parameter: string) =>
  parameter.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

const formatConfidence = (confidence?: number) => {
  if (confidence === undefined || confidence === null) {
    return "—";
  }

  const percentage = confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.round(percentage)}%`;
};

const getAccentClass = (parameter: string) => {
  const p = parameter.toLowerCase();
  if (p.includes("sugar")) return "blue";
  if (p.includes("pressure")) return "rose";
  if (p.includes("rate") || p.includes("heart")) return "violet";
  if (p.includes("temp")) return "orange";
  if (p.includes("weight")) return "teal";
  return "default";
};

const TimelineItem = ({ record }: TimelineItemProps) => {
  const accent = getAccentClass(record.parameter);

  return (
    <article className={`timeline-item timeline-item--accent-${accent}`}>
      <div className="timeline-item__measurement">
        <span className={`timeline-item__badge-label timeline-item__badge-label--${accent}`}>
          {formatParameter(record.parameter)}
        </span>
        <p className="timeline-item__value">
          {record.value}
          {record.unit ? <span>{record.unit}</span> : null}
        </p>
      </div>

      <div className="timeline-item__detail">
        <span className="timeline-item__detail-label">Recorded Time</span>
        <span className="timeline-item__detail-value">{formatLongDate(record.recordedAt)}</span>
      </div>

      <div className="timeline-item__detail">
        <span className="timeline-item__detail-label">Source</span>
        <span className="timeline-item__source">{record.source ?? "Unknown"}</span>
      </div>

      <div className="timeline-item__detail">
        <span className="timeline-item__detail-label">Confidence</span>
        <span className="timeline-item__confidence-value">{formatConfidence(record.confidence)}</span>
      </div>
    </article>
  );
};

export default TimelineItem;
