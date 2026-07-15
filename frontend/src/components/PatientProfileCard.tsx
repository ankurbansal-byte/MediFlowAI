import { formatLongDate } from "../utils/date";

export type PatientProfileProps = {
  patientId: string;
  latestRecordedAt?: string;
  totalRecords: number;
  isLoading?: boolean;
};

const PatientProfileCard = ({
  patientId,
  latestRecordedAt,
  totalRecords,
  isLoading = false,
}: PatientProfileProps) => {
  if (isLoading) {
    return (
      <div className="patient-profile-card patient-profile-card--loading">
        <div className="patient-profile-card__skeleton-title" />
        <div className="patient-profile-card__skeleton-grid">
          <div className="patient-profile-card__skeleton-item" />
          <div className="patient-profile-card__skeleton-item" />
          <div className="patient-profile-card__skeleton-item" />
          <div className="patient-profile-card__skeleton-item" />
        </div>
      </div>
    );
  }

  const hasData = totalRecords > 0;
  const monitoringStatus = hasData ? "Active Monitoring" : "Awaiting Records";
  const statusAccent = hasData ? "active" : "inactive";

  return (
    <section className="patient-profile-card" aria-labelledby="patient-profile-title">
      <div className="patient-profile-card__header">
        <div className="patient-profile-card__badge-container">
          <span className="patient-profile-card__eyebrow">Clinical File</span>
          <h2 className="patient-profile-card__title" id="patient-profile-title">
            Patient: <span className="patient-profile-card__id">{patientId || "N/A"}</span>
          </h2>
        </div>
        <div className={`patient-profile-card__status patient-profile-card__status--${statusAccent}`}>
          <span className="patient-profile-card__status-dot" aria-hidden="true" />
          <span className="patient-profile-card__status-text">{monitoringStatus}</span>
        </div>
      </div>

      <div className="patient-profile-card__details-grid">
        <div className="patient-profile-card__detail-item">
          <span className="patient-profile-card__detail-label">Patient ID</span>
          <strong className="patient-profile-card__detail-value">{patientId || "—"}</strong>
        </div>

        <div className="patient-profile-card__detail-item">
          <span className="patient-profile-card__detail-label">Latest Record Date</span>
          <strong className="patient-profile-card__detail-value">
            {latestRecordedAt ? formatLongDate(latestRecordedAt) : "No records yet"}
          </strong>
        </div>

        <div className="patient-profile-card__detail-item">
          <span className="patient-profile-card__detail-label">Total Records</span>
          <strong className="patient-profile-card__detail-value">
            {totalRecords ?? 0} {totalRecords === 1 ? "entry" : "entries"}
          </strong>
        </div>

        <div className="patient-profile-card__detail-item">
          <span className="patient-profile-card__detail-label">Monitoring Status</span>
          <strong className={`patient-profile-card__detail-value patient-profile-card__detail-value--status-${statusAccent}`}>
            {monitoringStatus}
          </strong>
        </div>
      </div>
    </section>
  );
};

export default PatientProfileCard;
