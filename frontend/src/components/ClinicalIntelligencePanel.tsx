import { useMemo } from "react";
import { type PatientSummaryMap } from "../services/patientService";
import { evaluatePatientClinicalStatus, type ClinicalAlert } from "../utils/clinicalRules";

type ClinicalIntelligencePanelProps = {
  summary: PatientSummaryMap | null;
  isLoading: boolean;
};

const ClinicalIntelligencePanel = ({ summary, isLoading }: ClinicalIntelligencePanelProps) => {
  const clinicalResult = useMemo(() => {
    return evaluatePatientClinicalStatus(summary);
  }, [summary]);

  if (isLoading) {
    return (
      <div className="clinical-panel clinical-panel--loading">
        <div className="clinical-panel__skeleton-header" />
        <div className="clinical-panel__skeleton-body" />
      </div>
    );
  }

  const { status, alerts } = clinicalResult;

  // Status configuration for professional medical visual presentation
  const statusConfig = {
    Stable: {
      accent: "stable",
      title: "Patient is Clinically Stable",
      description: "All monitored physiological parameters are currently within normal baseline ranges. Continue routine observation.",
      icon: "✓",
      badgeColor: "#178f80",
    },
    "Needs Attention": {
      accent: "attention",
      title: "Needs Attention",
      description: "One or more physiological vitals deviate from target thresholds. Review logs and consider adjustments.",
      icon: "⚠",
      badgeColor: "#d67b2a",
    },
    Critical: {
      accent: "critical",
      title: "Critical Clinical Status",
      description: "Urgent physiological deviation detected. Requires immediate medical assessment and potential intervention.",
      icon: "🚨",
      badgeColor: "#c84d64",
    },
  }[status];

  return (
    <section className="clinical-panel" aria-labelledby="clinical-intel-title">
      <div className="clinical-panel__header">
        <p className="summary-section__eyebrow">Clinical Assessment</p>
        <h2 className="clinical-panel__title" id="clinical-intel-title">Clinical Intelligence Status</h2>
      </div>

      <div className="clinical-panel__main-grid">
        {/* Clinical Status Card */}
        <div className={`status-display status-display--${statusConfig.accent}`}>
          <div className="status-display__icon-wrapper">
            <span className="status-display__icon">{statusConfig.icon}</span>
          </div>
          <div className="status-display__content">
            <div className="status-display__badge-row">
              <span className={`status-display__badge status-display__badge--${statusConfig.accent}`}>
                {status.toUpperCase()}
              </span>
              <span className="status-display__sub">Physiological Status</span>
            </div>
            <h3 className="status-display__title">{statusConfig.title}</h3>
            <p className="status-display__description">{statusConfig.description}</p>
          </div>
        </div>

        {/* Clinical Alerts Section */}
        <div className="alerts-display">
          <h4 className="alerts-display__title">
            Active Clinical Alerts <span className="alerts-display__count">{alerts.length}</span>
          </h4>

          {alerts.length === 0 ? (
            <div className="alerts-display__empty">
              <span className="alerts-display__empty-icon">✓</span>
              <p>No active physiological alerts. All recorded values are currently within standard parameters.</p>
            </div>
          ) : (
            <div className="alerts-display__list">
              {alerts.map((alert: ClinicalAlert, index) => {
                return (
                  <div
                    key={`${alert.parameter}-${index}`}
                    className={`alert-item alert-item--${alert.severity}`}
                  >
                    <span className={`alert-item__badge alert-item__badge--${alert.severity}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <div className="alert-item__details">
                      <p className="alert-item__message">{alert.message}</p>
                      <span className="alert-item__value">Latest recorded: {alert.valueString}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ClinicalIntelligencePanel;
