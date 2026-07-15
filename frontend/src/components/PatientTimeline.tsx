import { useMemo } from "react";
import TimelineItem, { type TimelineRecord } from "./TimelineItem";

type PatientTimelineProps = {
  records: TimelineRecord[];
  isLoading: boolean;
  hasError: boolean;
  emptyMessage?: string;
};

const getGroupTitle = (dateStr?: string) => {
  if (!dateStr) return "Unscheduled Records";
  const recordDate = new Date(dateStr);
  if (isNaN(recordDate.getTime())) return "Unscheduled Records";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  if (isSameDay(recordDate, today)) {
    return "Today";
  } else if (isSameDay(recordDate, yesterday)) {
    return "Yesterday";
  } else {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(recordDate);
  }
};

const PatientTimeline = ({ records, isLoading, hasError, emptyMessage }: PatientTimelineProps) => {
  const groupedRecords = useMemo(() => {
    const groups: { [key: string]: TimelineRecord[] } = {};
    for (const record of records) {
      const title = getGroupTitle(record.recordedAt);
      if (!groups[title]) {
        groups[title] = [];
      }
      groups[title].push(record);
    }
    return Object.keys(groups).map((title) => ({
      title,
      items: groups[title],
    }));
  }, [records]);

  return (
    <section className="timeline-section" aria-labelledby="patient-timeline-title">
      <div className="timeline-section__heading-row">
        <div>
          <p className="summary-section__eyebrow">Clinical history</p>
          <h2 className="timeline-section__heading" id="patient-timeline-title">
            Patient timeline
          </h2>
        </div>
        {!isLoading && !hasError ? <span className="timeline-section__count">{records.length} records</span> : null}
      </div>

      {isLoading ? (
        <div className="clinical-timeline-skeleton">
          <div className="clinical-timeline-skeleton__group" />
          <div className="clinical-timeline-skeleton__item" />
          <div className="clinical-timeline-skeleton__item" />
        </div>
      ) : null}

      {hasError ? (
        <div className="clinical-state-card clinical-state-card--error">
          <span className="clinical-state-card__icon" aria-hidden="true">⚠</span>
          <div className="clinical-state-card__content">
            <h3 className="clinical-state-card__title">Clinical Timeline Unavailable</h3>
            <p className="clinical-state-card__message">
              The patient history timeline could not be retrieved. Please check system network status or try again later.
            </p>
          </div>
        </div>
      ) : null}

      {!isLoading && !hasError && records.length === 0 ? (
        <div className="clinical-state-card clinical-state-card--empty">
          <span className="clinical-state-card__icon" aria-hidden="true">◈</span>
          <div className="clinical-state-card__content">
            <h3 className="clinical-state-card__title">No Records Available</h3>
            <p className="clinical-state-card__message">
              {emptyMessage ?? "There are currently no physiological observations recorded in this patient's history log."}
            </p>
          </div>
        </div>
      ) : null}

      {!isLoading && !hasError && records.length > 0 ? (
        <div className="timeline-grouped-list">
          {groupedRecords.map((group) => (
            <div className="timeline-group" key={group.title}>
              <h3 className="timeline-group__title">{group.title}</h3>
              <div className="timeline-list">
                {group.items.map((record, index) => (
                  <TimelineItem key={`${record.parameter}-${record.recordedAt ?? index}`} record={record} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default PatientTimeline;
