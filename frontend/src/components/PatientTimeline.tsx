import TimelineItem, { type TimelineRecord } from "./TimelineItem";

type PatientTimelineProps = {
  records: TimelineRecord[];
  isLoading: boolean;
  hasError: boolean;
  emptyMessage?: string;
};

const PatientTimeline = ({ records, isLoading, hasError, emptyMessage }: PatientTimelineProps) => (
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

    {isLoading ? <p className="timeline-section__state">Loading patient timeline...</p> : null}
    {hasError ? <p className="timeline-section__state timeline-section__state--error">Timeline is currently unavailable. Please try again later.</p> : null}
    {!isLoading && !hasError && records.length === 0 ? <p className="timeline-section__state">{emptyMessage ?? "No health records have been recorded for this patient."}</p> : null}
    {!isLoading && !hasError && records.length > 0 ? (
      <div className="timeline-list">
        {records.map((record, index) => (
          <TimelineItem key={`${record.parameter}-${record.recordedAt ?? index}`} record={record} />
        ))}
      </div>
    ) : null}
  </section>
);

export default PatientTimeline;
