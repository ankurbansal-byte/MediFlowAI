import React, { useMemo, useState } from "react";
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
import HealthSummary from "../components/HealthSummary";
import RecordSubmissionModal from "../components/RecordSubmissionModal";
import { usePatients } from "../hooks/usePatients";
import { usePatientData } from "../hooks/usePatientData";
import { useTrendData } from "../hooks/useTrendData";
import { calculateParameterStats } from "../utils/stats";
import { type User } from "../App";
import "./Dashboard.css";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    patients,
    selectedPatientId,
    setSelectedPatientId,
    isPatientsLoading,
    hasPatientsError,
    refetch: refetchPatients,
  } = usePatients();

  // If role is patient, override selection to patient's ID
  const effectivePatientId = user.role === "patient" ? (user.patientId ?? "") : selectedPatientId;

  // Sync selected patient option
  const selectedPatientOption = patients.find(p => p.patientId === effectivePatientId);

  const {
    summary,
    timeline,
    timelineFilter,
    setTimelineFilter,
    isTimelineLoading,
    hasSummaryError,
    hasTimelineError,
    refetch: refetchPatientData,
  } = usePatientData(effectivePatientId);

  const {
    trends,
    trend,
    trendPeriod,
    setTrendPeriod,
    selectedParameter,
    setSelectedParameter,
    isTrendLoading,
    hasTrendError,
    refetch: refetchTrendData,
  } = useTrendData(effectivePatientId);

  const handleSuccess = () => {
    refetchPatients();
    refetchPatientData();
    refetchTrendData();
  };

  const bloodSugarStats = useMemo(() => calculateParameterStats(trends.blood_sugar, "blood_sugar", summary?.blood_sugar?.unit), [trends.blood_sugar, summary?.blood_sugar?.unit]);
  const bloodPressureStats = useMemo(() => calculateParameterStats(trends.blood_pressure, "blood_pressure", summary?.blood_pressure?.unit), [trends.blood_pressure, summary?.blood_pressure?.unit]);
  const heartRateStats = useMemo(() => calculateParameterStats(trends.heart_rate, "heart_rate", summary?.heart_rate?.unit), [trends.heart_rate, summary?.heart_rate?.unit]);
  const temperatureStats = useMemo(() => calculateParameterStats(trends.body_temperature, "body_temperature", summary?.body_temperature?.unit), [trends.body_temperature, summary?.body_temperature?.unit]);
  const weightStats = useMemo(() => calculateParameterStats(trends.weight, "weight", summary?.weight?.unit), [trends.weight, summary?.weight?.unit]);

  const visibleTimeline = timelineFilter === "all"
    ? timeline
    : timeline.filter((record) => record.parameter === timelineFilter);

  return (
    <div className={`dashboard ${user.role === "patient" ? "dashboard--patient" : ""}`}>
      <Sidebar onLogout={onLogout} userRole={user.role} />
      {user.role === "doctor" && (
        <PatientListPanel
          patients={patients}
          selectedPatientId={effectivePatientId}
          onSelect={setSelectedPatientId}
          isLoading={isPatientsLoading}
          isError={hasPatientsError}
        />
      )}
      <main className={`dashboard__content ${user.role === "patient" ? "dashboard__content--patient" : ""}`} style={user.role === "patient" ? { paddingLeft: "32px", paddingRight: "32px" } : {}}>
        {user.role === "patient" ? (
          <div className="patient-welcome-section">
            <div className="patient-welcome-section__info">
              <h1 className="patient-welcome-section__title">Welcome, {user.username}</h1>
              <p className="patient-welcome-section__subtitle">Your health summary at a glance.</p>
            </div>
            <button
              className="btn-add-record"
              onClick={() => setIsModalOpen(true)}
            >
              <span className="btn-add-record__icon">+</span> Add New Health Record
            </button>
          </div>
        ) : (
          <DashboardHeader userRole={user.role} username={user.username} />
        )}

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
        ) : !effectivePatientId ? (
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
                patientId={effectivePatientId}
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
                  <SummaryCard
                    accent="blue"
                    icon="◒"
                    label="Blood Sugar"
                    stats={bloodSugarStats}
                    isSelected={selectedParameter === "blood_sugar"}
                    onClick={() => setSelectedParameter("blood_sugar")}
                  />
                  <SummaryCard
                    accent="rose"
                    icon="♥"
                    label="Blood Pressure"
                    stats={bloodPressureStats}
                    isSelected={selectedParameter === "blood_pressure"}
                    onClick={() => setSelectedParameter("blood_pressure")}
                  />
                  <SummaryCard
                    accent="violet"
                    icon="⌁"
                    label="Heart Rate"
                    stats={heartRateStats}
                    isSelected={selectedParameter === "heart_rate"}
                    onClick={() => setSelectedParameter("heart_rate")}
                  />
                  <SummaryCard
                    accent="orange"
                    icon="°"
                    label="Temperature"
                    stats={temperatureStats}
                    isSelected={selectedParameter === "body_temperature"}
                    onClick={() => setSelectedParameter("body_temperature")}
                  />
                  <SummaryCard
                    accent="teal"
                    icon="◈"
                    label="Weight"
                    stats={weightStats}
                    isSelected={selectedParameter === "weight"}
                    onClick={() => setSelectedParameter("weight")}
                  />
                </div>
              )}
            </section>

            <HealthSummary
              trends={trends}
              selectedParameter={selectedParameter}
              setSelectedParameter={setSelectedParameter}
              period={trendPeriod}
              isLoading={isTrendLoading}
            />

            <TrendChart
              hasError={hasTrendError}
              isLoading={isTrendLoading}
              onPeriodChange={setTrendPeriod}
              period={trendPeriod}
              records={trend}
              parameter={selectedParameter}
            />
            <AIInsights
              hasError={hasTrendError}
              isLoading={isTrendLoading}
              records={trend}
              parameter={selectedParameter}
            />

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
      <RecordSubmissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default Dashboard;
