import { useEffect, useState } from "react";
import AIInsights from "../components/AIInsights";
import DashboardHeader from "../components/DashboardHeader";
import PatientSelector, { type PatientOption } from "../components/PatientSelector";
import PatientTimeline from "../components/PatientTimeline";
import Sidebar from "../components/Sidebar";
import SummaryCard from "../components/SummaryCard";
import TimelineFilter, { type TimelineFilterValue } from "../components/TimelineFilter";
import { type TimelineRecord } from "../components/TimelineItem";
import TrendChart, { type TrendPeriod, type TrendRecord } from "../components/TrendChart";
import { getPatients, getPatientSummary, getPatientTimeline, getPatientTrend } from "../services/patientService";
import "./Dashboard.css";

type Measurement = { value?: string | number; unit?: string };
type PatientSummary = Record<string, Measurement | undefined>;

const Dashboard = () => {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelineRecord[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilterValue>("all");
  const [trend, setTrend] = useState<TrendRecord[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>(30);
  const [hasPatientsError, setHasPatientsError] = useState(false);
  const [hasSummaryError, setHasSummaryError] = useState(false);
  const [hasTimelineError, setHasTimelineError] = useState(false);
  const [hasTrendError, setHasTrendError] = useState(false);
  const [isPatientsLoading, setIsPatientsLoading] = useState(true);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [isTrendLoading, setIsTrendLoading] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await getPatients();
        const availablePatients = Array.isArray(data.patients) ? (data.patients as PatientOption[]) : [];
        setPatients(availablePatients);
        setSelectedPatientId(availablePatients[0]?.patientId ?? "");
      } catch (error) {
        console.error(error);
        setHasPatientsError(true);
      } finally {
        setIsPatientsLoading(false);
      }
    };

    loadPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;

    let isCurrentRequest = true;

    const loadPatientData = async () => {
      setSummary(null);
      setTimeline([]);
      setTimelineFilter("all");
      setHasSummaryError(false);
      setHasTimelineError(false);
      setIsTimelineLoading(true);

      try {
        const data = await getPatientSummary(selectedPatientId);
        if (isCurrentRequest) setSummary(data.summary as PatientSummary);
      } catch (error) {
        console.error(error);
        if (isCurrentRequest) setHasSummaryError(true);
      }

      try {
        const data = await getPatientTimeline(selectedPatientId);
        if (isCurrentRequest) setTimeline(Array.isArray(data.records) ? (data.records as TimelineRecord[]) : []);
      } catch (error) {
        console.error(error);
        if (isCurrentRequest) setHasTimelineError(true);
      } finally {
        if (isCurrentRequest) setIsTimelineLoading(false);
      }
    };

    loadPatientData();
    return () => { isCurrentRequest = false; };
  }, [selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) return;

    let isCurrentRequest = true;

    const loadTrend = async () => {
      setTrend([]);
      setHasTrendError(false);
      setIsTrendLoading(true);

      try {
        const data = await getPatientTrend(selectedPatientId, "blood_sugar", trendPeriod);
        if (isCurrentRequest) setTrend(Array.isArray(data.records) ? (data.records as TrendRecord[]) : []);
      } catch (error) {
        console.error(error);
        if (isCurrentRequest) setHasTrendError(true);
      } finally {
        if (isCurrentRequest) setIsTrendLoading(false);
      }
    };

    loadTrend();
    return () => { isCurrentRequest = false; };
  }, [selectedPatientId, trendPeriod]);

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
