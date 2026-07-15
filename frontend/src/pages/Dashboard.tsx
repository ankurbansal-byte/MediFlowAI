import AIInsights from "../components/AIInsights";
import DashboardHeader from "../components/DashboardHeader";
import PatientSelector from "../components/PatientSelector";
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

  const {
    trend,
    trendPeriod,
    setTrendPeriod,
    isTrendLoading,
    hasTrendError,
  } = useTrendData(selectedPatientId);

  if (isPatientsLoading) return <main className="dashboard__state">Loading patients...</main>;

  if (hasPatientsError) {
    return <main className="dashboard__state"><div className="dashboard__state-card"><h1>Patients unavailable</h1><p>Please check the connection and try again.</p></div></main>;
  }

  if (!selectedPatientId) {
    return <main className="dashboard__state"><div className="dashboard__state-card"><h1>No patients found</h1><p>Health records will appear here once a patient has submitted a measurement.</p></div></main>;
  }

  if (hasSummaryError) {
    return <main className="dashboard__state"><div className="dashboard__state-card"><h1>Patient summary unavailable</h1><p>Please check the connection and try again.</p></div></main>;
  }

  if (!summary) return <main className="dashboard__state">Loading patient summary...</main>;

  const visibleTimeline = timelineFilter === "all"
    ? timeline
    : timeline.filter((record) => record.parameter === timelineFilter);

  return (
    <div className="dashboard">
      <Sidebar />
      <main className="dashboard__content">
        <DashboardHeader />
        <section className="summary-section" aria-labelledby="patient-summary-title">
          <div className="summary-section__top-row">
            <div><p className="summary-section__eyebrow">Patient overview</p><h2 className="summary-section__heading" id="patient-summary-title">Latest vital measurements</h2></div>
            <PatientSelector onSelect={setSelectedPatientId} patients={patients} selectedPatientId={selectedPatientId} />
          </div>
          <p className="summary-section__description">A concise view of the patient&apos;s most recently recorded health data.</p>
          <div className="summary-grid">
            <SummaryCard accent="blue" icon="◒" label="Blood Sugar" unit={summary.blood_sugar?.unit} value={summary.blood_sugar?.value} />
            <SummaryCard accent="rose" icon="♥" label="Blood Pressure" unit={summary.blood_pressure?.unit} value={summary.blood_pressure?.value} />
            <SummaryCard accent="violet" icon="⌁" label="Heart Rate" unit={summary.heart_rate?.unit} value={summary.heart_rate?.value} />
            <SummaryCard accent="orange" icon="°" label="Temperature" unit={summary.body_temperature?.unit} value={summary.body_temperature?.value} />
            <SummaryCard accent="teal" icon="◈" label="Weight" unit={summary.weight?.unit} value={summary.weight?.value} />
          </div>
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
      </main>
    </div>
  );
};

export default Dashboard;
