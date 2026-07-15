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

const TimelineItem = ({ record }: TimelineItemProps) => (
  <article className="timeline-item">
    <div className="timeline-item__measurement">
      <p className="timeline-item__parameter">{formatParameter(record.parameter)}</p>
      <p className="timeline-item__value">
        {record.value}
        {record.unit ? <span>{record.unit}</span> : null}
      </p>
    </div>

    <div className="timeline-item__detail">
      <span className="timeline-item__detail-label">Recorded</span>
      <span>{formatLongDate(record.recordedAt)}</span>
    </div>

    <div className="timeline-item__detail">
      <span className="timeline-item__detail-label">Source</span>
      <span className="timeline-item__source">{record.source ?? "Unknown"}</span>
    </div>

    <div className="timeline-item__detail">
      <span className="timeline-item__detail-label">Confidence</span>
      <span>{formatConfidence(record.confidence)}</span>
    </div>
  </article>
);

export default TimelineItem;
