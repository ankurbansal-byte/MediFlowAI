import { formatRecordDateTime, formatGlucoseContext } from "../utils/date";

export type TimelineRecord = {
  id?: string;
  patientId?: string;
  category?: "health_reading" | "lab_observation";
  displayLabel?: string;
  parameter: string;
  value: string | number;
  unit?: string;
  context?: string;
  timeContext?: string;
  recordedAt?: string;
  source?: string;
  confidence?: number;
  systolic?: number;
  diastolic?: number;
  testName?: string;
  flag?: string;
  referenceRangeText?: string;
  labReportId?: string;
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
  const isLab = record.category === "lab_observation";
  const accent = isLab ? "violet" : getAccentClass(record.parameter);
  const displayLabel = record.displayLabel || (isLab ? record.testName : formatParameter(record.parameter)) || formatParameter(record.parameter);

  return (
    <article className={`timeline-item timeline-item--accent-${accent}`} style={{ position: "relative" }}>
      {/* Category Tag */}
      <span style={{
        position: "absolute",
        top: "8px",
        right: "12px",
        fontSize: "0.65rem",
        fontWeight: 850,
        textTransform: "uppercase",
        background: isLab ? "#f5f3ff" : "#f1f5f9",
        color: isLab ? "#6b21a8" : "#475569",
        padding: "2px 6px",
        borderRadius: "4px"
      }}>
        {isLab ? "LAB RESULT" : "ROUTINE"}
      </span>

      <div className="timeline-item__measurement">
        <span className={`timeline-item__badge-label timeline-item__badge-label--${accent}`}>
          {displayLabel}
        </span>
        <p className="timeline-item__value" style={{ marginTop: "8px" }}>
          {record.value}
          {record.unit ? <span>{record.unit}</span> : null}
          {!isLab && record.parameter === "blood_sugar" && record.context && formatGlucoseContext(record.context) ? (
            <span style={{ fontSize: "0.85em", color: "var(--muted)", fontWeight: "normal", marginLeft: "6px" }}>
              · {formatGlucoseContext(record.context)}
            </span>
          ) : null}
        </p>

        {isLab && (record.referenceRangeText || record.flag) && (
          <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "var(--muted)" }}>
            {record.referenceRangeText && (
              <span>Range: <strong>{record.referenceRangeText}</strong></span>
            )}
            {record.flag && (
              <span style={{
                marginLeft: "8px",
                fontWeight: 800,
                color: record.flag.toLowerCase() === "high" || record.flag.toLowerCase() === "low" ? "#ef4444" : "#10b981",
                textTransform: "uppercase"
              }}>
                [{record.flag}]
              </span>
            )}
          </div>
        )}
      </div>

      <div className="timeline-item__detail">
        <span className="timeline-item__detail-label">Observed Time</span>
        <span className="timeline-item__detail-value">
          {!isLab && record.timeContext ? (
            <>
              {record.timeContext.charAt(0).toUpperCase() + record.timeContext.slice(1)} · {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(record.recordedAt!))}
              <span style={{ fontSize: "0.85em", color: "var(--muted)", fontWeight: "normal", marginLeft: "6px" }}>
                (Submitted {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(record.recordedAt!))})
              </span>
            </>
          ) : (
            formatRecordDateTime(record.recordedAt)
          )}
        </span>
      </div>

      <div className="timeline-item__detail">
        <span className="timeline-item__detail-label">Source</span>
        <span className="timeline-item__source" style={{ textTransform: "capitalize" }}>
          {isLab ? "Lab Report" : (record.source ?? "Unknown")}
        </span>
      </div>

      <div className="timeline-item__detail">
        <span className="timeline-item__detail-label">Confidence</span>
        <span className="timeline-item__confidence-value">
          {isLab ? "100% (Verified)" : formatConfidence(record.confidence)}
        </span>
      </div>
    </article>
  );
};

export default TimelineItem;
