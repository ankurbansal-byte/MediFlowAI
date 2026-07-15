import AIInsights from "../components/AIInsights";
import ClinicalIntelligencePanel from "../components/ClinicalIntelligencePanel";
import DashboardHeader from "../components/DashboardHeader";
import PatientProfileCard from "../components/PatientProfileCard";
import PatientListPanel from "../components/PatientListPanel";
import PatientTimeline from "../components/PatientTimeline";
import Sidebar from "../components/Sidebar";
import SummaryCard from "../components/SummaryCard";
import TimelineFilter from "../components/TimelineFilter";
import TrendChart from "../components/TrendChart";
import { usePatients } from "../hooks/usePatients";
import { usePatientData } from "../hooks/usePatientData";
import { useTrendData } from "../hooks/useTrendData";
import "./Dashboard.css";

const Dashboard = () => {
  const {
    patients,
    selectedPatientId,
    setSelectedPatientId,
    isPatientsLoading,
    hasPatientsError,
  } = usePatients();

  const {
    summary,
    timeline,
    timelineFilter,
    setTimelineFilter,
    isTimelineLoading,
    hasSummaryError,
    hasTimelineError,
  } = usePatientData(selectedPatientId);

  const selectedPatientOption = patients.find(p => p.patientId === selectedPatientId);

  const {
    trend,
    trendPeriod,
    setTrendPeriod,
    isTrendLoading,
    hasTrendError,
  } = useTrendData(selectedPatientId);

  const visibleTimeline = timelineFilter === "all"
    ? timeline
    : timeline.filter((record) => record.parameter === timelineFilter);

  return (
    <div className="dashboard">
      <Sidebar />
      <PatientListPanel
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelect={setSelectedPatientId}
        isLoading={isPatientsLoading}
        isError={hasPatientsError}
      />
      <main className="dashboard__content">
        <DashboardHeader />

        {isPatientsLoading ? (
          <div className="dashboard__loading-container">
            <p className="dashboard__loading-text">Loading workspace...</p>
            <div className="patient-profile-card patient-profile-card--loading">
              <div className="patient-profile-card__skeleton-title" />
              <div className="patient-profile-card__skeleton-grid">
                <div className="patient-profile-card__skeleton-item" />
                <div className="patient-profile-card__skeleton-item" />
                <div className="patient-profile-card__skeleton-item" />
                <div className="patient-profile-card__skeleton-item" />
              </div>
            </div>
          </div>
        ) : hasPatientsError ? (
          <div className="dashboard__state-card" style={{ margin: "40px auto" }}>
            <h1>Patients unavailable</h1>
            <p>Please check the connection and try again.</p>
          </div>
        ) : !selectedPatientId ? (
          <div className="dashboard__state-card" style={{ margin: "40px auto" }}>
            <h1>No patients found</h1>
            <p>Health records will appear here once a patient has submitted a measurement.</p>
          </div>
        ) : (
          <>
            <section className="summary-section" aria-labelledby="patient-summary-title">
              <div className="summary-section__top-row">
                <div>
                  <p className="summary-section__eyebrow">Patient overview</p>
                  <h2 className="summary-section__heading" id="patient-summary-title">
                    Patient workspace & vital statistics
                  </h2>
                </div>
              </div>
              <p className="summary-section__description">A clinical overview of the selected patient&apos;s records and vital trends.</p>

              <PatientProfileCard
                patientId={selectedPatientId}
                latestRecordedAt={selectedPatientOption?.latestRecordedAt}
                totalRecords={selectedPatientOption?.totalRecords ?? 0}
                isLoading={isPatientsLoading}
              />

              <ClinicalIntelligencePanel
                summary={summary}
                isLoading={isTimelineLoading || isPatientsLoading}
              />

              {hasSummaryError ? (
                <div className="dashboard__state-card dashboard__state-card--embedded">
                  <h1>Patient summary unavailable</h1>
                  <p>Please check the connection and try again.</p>
                </div>
              ) : !summary ? (
                <div className="summary-grid">
                  <div className="summary-card--loading" />
                  <div className="summary-card--loading" />
                  <div className="summary-card--loading" />
                  <div className="summary-card--loading" />
                  <div className="summary-card--loading" />
                </div>
              ) : (
                <div className="summary-grid">
                  <SummaryCard accent="blue" icon="◒" label="Blood Sugar" unit={summary.blood_sugar?.unit} value={summary.blood_sugar?.value} />
                  <SummaryCard accent="rose" icon="♥" label="Blood Pressure" unit={summary.blood_pressure?.unit} value={summary.blood_pressure?.value} />
                  <SummaryCard accent="violet" icon="⌁" label="Heart Rate" unit={summary.heart_rate?.unit} value={summary.heart_rate?.value} />
                  <SummaryCard accent="orange" icon="°" label="Temperature" unit={summary.body_temperature?.unit} value={summary.body_temperature?.value} />
                  <SummaryCard accent="teal" icon="◈" label="Weight" unit={summary.weight?.unit} value={summary.weight?.value} />
                </div>
              )}
            </section>

            <TrendChart hasError={hasTrendError} isLoading={isTrendLoading} onPeriodChange={setTrendPeriod} period={trendPeriod} records={trend} />
            <AIInsights hasError={hasTrendError} isLoading={isTrendLoading} records={trend} />

            <div className="timeline-filter-section">
              <TimelineFilter onChange={setTimelineFilter} value={timelineFilter} />
            </div>

            <PatientTimeline
              emptyMessage={timeline.length > 0 ? "No health records match the selected filter." : undefined}
              hasError={hasTimelineError}
              isLoading={isTimelineLoading}
              records={visibleTimeline}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
