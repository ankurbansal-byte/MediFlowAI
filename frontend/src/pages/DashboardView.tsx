import React from "react";
import PatientProfileCard from "../components/PatientProfileCard";
import ClinicalIntelligencePanel from "../components/ClinicalIntelligencePanel";
import SummaryCard from "../components/SummaryCard";
import TimelineFilter from "../components/TimelineFilter";
import PatientTimeline from "../components/PatientTimeline";
import { type User } from "../App";
import { type PatientOption } from "../components/PatientSelector";
import { type PatientSummaryMap } from "../services/patientService";
import { type TimelineRecord } from "../components/TimelineItem";
import { type TimelineFilterValue } from "../components/TimelineFilter";
import { type ParameterStats } from "../utils/stats";
import { type HealthParameter } from "../hooks/useTrendData";

interface DashboardViewProps {
  user: User;
  effectivePatientId: string;
  selectedPatientOption?: PatientOption;
  summary: PatientSummaryMap | null;
  timeline: TimelineRecord[];
  timelineFilter: TimelineFilterValue;
  setTimelineFilter: (val: TimelineFilterValue) => void;
  isTimelineLoading: boolean;
  isPatientsLoading: boolean;
  hasSummaryError: boolean;
  hasTimelineError: boolean;
  bloodSugarStats: ParameterStats;
  bloodPressureStats: ParameterStats;
  heartRateStats: ParameterStats;
  temperatureStats: ParameterStats;
  weightStats: ParameterStats;
  selectedParameter: HealthParameter;
  setSelectedParameter: (param: HealthParameter) => void;
  visibleTimeline: TimelineRecord[];
  setIsModalOpen: (open: boolean) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  effectivePatientId,
  selectedPatientOption,
  summary,
  timeline,
  timelineFilter,
  setTimelineFilter,
  isTimelineLoading,
  isPatientsLoading,
  hasSummaryError,
  hasTimelineError,
  bloodSugarStats,
  bloodPressureStats,
  heartRateStats,
  temperatureStats,
  weightStats,
  selectedParameter,
  setSelectedParameter,
  visibleTimeline,
  setIsModalOpen,
}) => {
  return (
    <>
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
      ) : null}

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
  );
};

export default DashboardView;
