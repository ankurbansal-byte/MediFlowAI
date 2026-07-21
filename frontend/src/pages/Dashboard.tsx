import React, { useMemo, useState } from "react";
import DashboardHeader from "../components/DashboardHeader";
import PatientListPanel from "../components/PatientListPanel";
import Sidebar from "../components/Sidebar";
import RecordSubmissionModal from "../components/RecordSubmissionModal";
import DashboardView from "./DashboardView";
import TrendsView from "./TrendsView";
import AIInsightsView from "./AIInsightsView";
import SettingsView from "./SettingsView";
import { usePatients } from "../hooks/usePatients";
import { usePatientData } from "../hooks/usePatientData";
import { useTrendData } from "../hooks/useTrendData";
import { calculateParameterStats } from "../utils/stats";
import { type User } from "../App";
import "./Dashboard.css";

import ProfileView from "./ProfileView";
import HospitalView from "./HospitalView";
import PatientsView from "./PatientsView";

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onProfileUpdate: (updatedUser: User) => void;
}

export type TabType = "dashboard" | "trends" | "ai-insights" | "profile" | "settings" | "hospital" | "patients";

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onProfileUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return user.role === "admin" ? "patients" : "dashboard";
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); // Auto-close drawer on mobile navigation
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardView
            user={user}
            effectivePatientId={effectivePatientId}
            selectedPatientOption={selectedPatientOption}
            summary={summary}
            timeline={timeline}
            timelineFilter={timelineFilter}
            setTimelineFilter={setTimelineFilter}
            isTimelineLoading={isTimelineLoading}
            isPatientsLoading={isPatientsLoading}
            hasSummaryError={hasSummaryError}
            hasTimelineError={hasTimelineError}
            bloodSugarStats={bloodSugarStats}
            bloodPressureStats={bloodPressureStats}
            heartRateStats={heartRateStats}
            temperatureStats={temperatureStats}
            weightStats={weightStats}
            selectedParameter={selectedParameter}
            setSelectedParameter={setSelectedParameter}
            visibleTimeline={visibleTimeline}
            setIsModalOpen={setIsModalOpen}
          />
        );
      case "trends":
        return (
          <TrendsView
            trends={trends}
            selectedParameter={selectedParameter}
            setSelectedParameter={setSelectedParameter}
            trendPeriod={trendPeriod}
            setTrendPeriod={setTrendPeriod}
            isTrendLoading={isTrendLoading}
            hasTrendError={hasTrendError}
            trend={trend}
          />
        );
      case "ai-insights":
        return (
          <AIInsightsView
            trends={trends}
            selectedParameter={selectedParameter}
            setSelectedParameter={setSelectedParameter}
            isTrendLoading={isTrendLoading}
            hasTrendError={hasTrendError}
            trend={trend}
          />
        );
      case "hospital":
        return (
          <HospitalView
            user={user}
          />
        );
      case "patients":
        return (
          <PatientsView
            user={user}
          />
        );
      case "profile":
        return (
          <ProfileView
            user={user}
            onProfileUpdate={onProfileUpdate}
          />
        );
      case "settings":
        return (
          <SettingsView
            user={user}
            onLogout={onLogout}
          />
        );
      default:
        return <div>View not found</div>;
    }
  };

  const hasPatientPanel = user.role === "doctor" && activeTab !== "settings";

  return (
    <div className={`dashboard-wrapper ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Mobile Nav Top Bar Header */}
      <div className="mobile-top-bar">
        <button
          className="mobile-top-bar__hamburger"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open navigation menu"
          type="button"
        >
          ☰
        </button>
        <div className="mobile-top-bar__brand">
          <span className="mobile-top-bar__logo-mark">+</span>
          <span>MediFlowAI</span>
        </div>
        {user.role === "patient" && (
          <button
            className="mobile-top-bar__add-btn"
            onClick={() => setIsModalOpen(true)}
            title="Add New Record"
            type="button"
          >
            +
          </button>
        )}
      </div>

      <div className={`dashboard ${user.role === "patient" ? "dashboard--patient" : ""}`}>

        {/* Sidebar Container */}
        <div className={`sidebar-container ${isMobileMenuOpen ? "mobile-open" : ""}`}>
          {/* Overlay mask for Mobile drawer */}
          <div
            className="sidebar-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="sidebar-drawer">
            {/* Close button inside Mobile Drawer */}
            <button
              className="sidebar-drawer__close"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
              type="button"
            >
              ✕
            </button>
            <Sidebar
              onLogout={onLogout}
              userRole={user.role}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          </div>
        </div>

        {/* Doctor's Patients List Column */}
        {hasPatientPanel && (
          <PatientListPanel
            patients={patients}
            selectedPatientId={effectivePatientId}
            onSelect={setSelectedPatientId}
            isLoading={isPatientsLoading}
            isError={hasPatientsError}
          />
        )}

        {/* Scrollable Content Pane */}
        <main className={`dashboard__content ${user.role === "patient" ? "dashboard__content--patient" : ""}`}>
          {/* Standard Page Header */}
          {user.role === "doctor" && (
            <div style={{ marginBottom: "28px" }}>
              <DashboardHeader userRole={user.role} username={user.username} />
            </div>
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
            renderActiveView()
          )}
        </main>

        <RecordSubmissionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
};

export default Dashboard;
