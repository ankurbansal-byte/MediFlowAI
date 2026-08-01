import React, { useMemo, useState } from "react";
import DashboardHeader from "../components/DashboardHeader";
import PatientListPanel from "../components/PatientListPanel";
import Sidebar from "../components/Sidebar";
import SidebarV2 from "../components/SidebarV2";
import SidebarV3 from "../components/SidebarV3";
import SidebarV4 from "../components/SidebarV4";
import SidebarV5 from "../components/SidebarV5";
import SidebarV5_1 from "../components/SidebarV5_1";
import SidebarV5_2 from "../components/SidebarV5_2";
import RecordSubmissionModal from "../components/RecordSubmissionModal";
import DashboardView from "./DashboardView";
import DashboardViewV2 from "./DashboardViewV2";
import DashboardViewV3 from "./DashboardViewV3";
import DashboardViewV4 from "./DashboardViewV4";
import DashboardViewV5 from "./DashboardViewV5";
import DashboardViewV5_1 from "./DashboardViewV5_1";
import DashboardViewV5_2 from "./DashboardViewV5_2";
import TrendsView from "./TrendsView";
import TrendsViewV5 from "./TrendsViewV5";
import TrendsViewV5_2 from "./TrendsViewV5_2";
import AIInsightsView from "./AIInsightsView";
import AIInsightsViewV5 from "./AIInsightsViewV5";
import AIInsightsViewV5_2 from "./AIInsightsViewV5_2";
import SettingsView from "./SettingsView";
import { usePatients } from "../hooks/usePatients";
import { usePatientData } from "../hooks/usePatientData";
import { useTrendData } from "../hooks/useTrendData";
import { calculateParameterStats } from "../utils/stats";
import { type User } from "../App";
import "./Dashboard.css";

import ProfileView from "./ProfileView";
import ProfileViewV5 from "./ProfileViewV5";
import ProfileViewV5_2 from "./ProfileViewV5_2";
import SettingsViewV5 from "./SettingsViewV5";
import SettingsViewV5_2 from "./SettingsViewV5_2";
import HospitalView from "./HospitalView";
import PatientsView from "./PatientsView";
import DoctorsView from "./DoctorsView";
import HospitalVisitsView from "./HospitalVisitsView";
import DoctorVisitsView from "./DoctorVisitsView";
import DoctorHomeView from "./DoctorHomeView";
import TodayPatientsView from "./TodayPatientsView";
import MyPatientsView from "./MyPatientsView";
import PatientWorkspace from "./PatientWorkspace";
import AdminDashboardView from "./AdminDashboardView";

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onProfileUpdate: (updatedUser: User) => void;
  isV2?: boolean;
  isV3?: boolean;
  isV4?: boolean;
  isV5?: boolean;
  isV5_1?: boolean;
  isV5_2?: boolean;
  isRecordsV5?: boolean;
  isInsightsV5?: boolean;
  isProfileV5?: boolean;
  isSettingsV5?: boolean;
  isRecordsV5_2?: boolean;
  isInsightsV5_2?: boolean;
  isProfileV5_2?: boolean;
  isSettingsV5_2?: boolean;
}

export type TabType = "dashboard" | "trends" | "ai-insights" | "profile" | "settings" | "hospital" | "patients" | "doctors" | "visits-admin" | "doctor-visits" | "today-patients" | "my-patients";

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onProfileUpdate, isV2 = false, isV3 = false, isV4 = false, isV5 = false, isV5_1 = false, isV5_2 = false, isRecordsV5 = false, isInsightsV5 = false, isProfileV5 = false, isSettingsV5 = false, isRecordsV5_2 = false, isInsightsV5_2 = false, isProfileV5_2 = false, isSettingsV5_2 = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (isInsightsV5 || isInsightsV5_2) return "ai-insights";
    if (isRecordsV5 || isRecordsV5_2) return "trends";
    if (isProfileV5 || isProfileV5_2) return "profile";
    if (isSettingsV5 || isSettingsV5_2) return "settings";
    if (user.role === "admin") return "dashboard";
    if (user.role === "doctor") return "dashboard";
    return "dashboard";
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);

  // States for Doctor Workspace overlay/subview
  const [workspacePatientId, setWorkspacePatientId] = useState<string | null>(null);
  const [workspaceEncounterId, setWorkspaceEncounterId] = useState<string | null>(null);

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
    setWorkspacePatientId(null);
    setWorkspaceEncounterId(null);
    setIsMobileMenuOpen(false); // Auto-close drawer on mobile navigation
  };

  const renderActiveView = () => {
    // Role-based route authorization gate
    const isAdminView = ["hospital", "patients", "doctors", "visits-admin"].includes(activeTab);
    const isDoctorView = ["today-patients", "my-patients", "doctor-visits"].includes(activeTab);
    const isPatientView = ["trends", "ai-insights"].includes(activeTab);

    if (isAdminView && user.role !== "admin") {
      return (
        <div style={{ padding: "40px", textAlign: "center", color: "#e11d48", border: "1px solid #fda4af", borderRadius: "8px", background: "#fff5f5", margin: "20px auto", maxWidth: "600px" }}>
          <h2 style={{ color: "#ef4444", margin: "0 0 10px 0" }}>Access Denied</h2>
          <p style={{ margin: 0, fontWeight: 600 }}>You do not have administrative privileges to view this page.</p>
        </div>
      );
    }
    if (isDoctorView && user.role !== "doctor") {
      return (
        <div style={{ padding: "40px", textAlign: "center", color: "#e11d48", border: "1px solid #fda4af", borderRadius: "8px", background: "#fff5f5", margin: "20px auto", maxWidth: "600px" }}>
          <h2 style={{ color: "#ef4444", margin: "0 0 10px 0" }}>Access Denied</h2>
          <p style={{ margin: 0, fontWeight: 600 }}>You do not have clinician privileges to view this page.</p>
        </div>
      );
    }
    if (isPatientView && user.role !== "patient") {
      return (
        <div style={{ padding: "40px", textAlign: "center", color: "#e11d48", border: "1px solid #fda4af", borderRadius: "8px", background: "#fff5f5", margin: "20px auto", maxWidth: "600px" }}>
          <h2 style={{ color: "#ef4444", margin: "0 0 10px 0" }}>Access Denied</h2>
          <p style={{ margin: 0, fontWeight: 600 }}>You do not have patient privileges to view this page.</p>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        if (user.role === "doctor") {
          return (
            <DoctorHomeView
              user={user}
              onOpenPatient={(pId, encId) => {
                setWorkspacePatientId(pId);
                setWorkspaceEncounterId(encId);
              }}
            />
          );
        }
        if (user.role === "admin") {
          return (
            <AdminDashboardView
              user={user}
              onTabChange={handleTabChange}
            />
          );
        }
        return isV5_2 ? (
          <DashboardViewV5_2
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
            onTabChange={handleTabChange}
            setSelectedHistoryDate={setSelectedHistoryDate}
          />
        ) : isV5_1 ? (
          <DashboardViewV5_1
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
            onTabChange={handleTabChange}
            setSelectedHistoryDate={setSelectedHistoryDate}
          />
        ) : (isV5 || isRecordsV5 || isInsightsV5) ? (
          <DashboardViewV5
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
            onTabChange={handleTabChange}
            setSelectedHistoryDate={setSelectedHistoryDate}
          />
        ) : isV4 ? (
          <DashboardViewV4
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
            onTabChange={handleTabChange}
            setSelectedHistoryDate={setSelectedHistoryDate}
          />
        ) : isV3 ? (
          <DashboardViewV3
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
            onTabChange={handleTabChange}
            setSelectedHistoryDate={setSelectedHistoryDate}
          />
        ) : isV2 ? (
          <DashboardViewV2
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
            onTabChange={handleTabChange}
            setSelectedHistoryDate={setSelectedHistoryDate}
          />
        ) : (
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
            onTabChange={handleTabChange}
            setSelectedHistoryDate={setSelectedHistoryDate}
          />
        );
      case "today-patients":
        return (
          <TodayPatientsView
            user={user}
            onOpenPatient={(pId, encId) => {
              setWorkspacePatientId(pId);
              setWorkspaceEncounterId(encId);
            }}
          />
        );
      case "my-patients":
        return (
          <MyPatientsView
            user={user}
            onOpenPatient={(pId, encId) => {
              setWorkspacePatientId(pId);
              setWorkspaceEncounterId(encId);
            }}
          />
        );
      case "trends":
        return (isV5_2 || isRecordsV5_2) ? (
          <TrendsViewV5_2
            patientId={effectivePatientId}
            trends={trends}
            selectedParameter={selectedParameter}
            setSelectedParameter={setSelectedParameter}
            trendPeriod={trendPeriod}
            setTrendPeriod={setTrendPeriod}
            isTrendLoading={isTrendLoading}
            hasTrendError={hasTrendError}
            trend={trend}
            timeline={timeline}
            selectedHistoryDate={selectedHistoryDate}
            setSelectedHistoryDate={setSelectedHistoryDate}
          />
        ) : (isV5 || isRecordsV5 || isInsightsV5) ? (
          <TrendsViewV5
            patientId={effectivePatientId}
            trends={trends}
            selectedParameter={selectedParameter}
            setSelectedParameter={setSelectedParameter}
            trendPeriod={trendPeriod}
            setTrendPeriod={setTrendPeriod}
            isTrendLoading={isTrendLoading}
            hasTrendError={hasTrendError}
            trend={trend}
            timeline={timeline}
            selectedHistoryDate={selectedHistoryDate}
            setSelectedHistoryDate={setSelectedHistoryDate}
          />
        ) : (
          <TrendsView
            patientId={effectivePatientId}
            trends={trends}
            selectedParameter={selectedParameter}
            setSelectedParameter={setSelectedParameter}
            trendPeriod={trendPeriod}
            setTrendPeriod={setTrendPeriod}
            isTrendLoading={isTrendLoading}
            hasTrendError={hasTrendError}
            trend={trend}
            timeline={timeline}
            selectedHistoryDate={selectedHistoryDate}
            setSelectedHistoryDate={setSelectedHistoryDate}
          />
        );
      case "ai-insights":
        return (isV5_2 || isRecordsV5_2 || isInsightsV5_2) ? (
          <AIInsightsViewV5_2
            trends={trends}
            selectedParameter={selectedParameter}
            setSelectedParameter={setSelectedParameter}
            isTrendLoading={isTrendLoading}
            hasTrendError={hasTrendError}
            trend={trend}
          />
        ) : (isV5 || isRecordsV5 || isInsightsV5) ? (
          <AIInsightsViewV5
            trends={trends}
            selectedParameter={selectedParameter}
            setSelectedParameter={setSelectedParameter}
            isTrendLoading={isTrendLoading}
            hasTrendError={hasTrendError}
            trend={trend}
          />
        ) : (
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
      case "doctors":
        return (
          <DoctorsView
            user={user}
          />
        );
      case "visits-admin":
        return (
          <HospitalVisitsView
            user={user}
          />
        );
      case "doctor-visits":
        return (
          <DoctorVisitsView
            user={user}
          />
        );
      case "profile":
        if (isV5_2 || isProfileV5_2) {
          return (
            <ProfileViewV5_2
              user={user}
              onProfileUpdate={onProfileUpdate}
            />
          );
        }
        return (isV5 || isRecordsV5 || isInsightsV5 || isProfileV5 || isSettingsV5) ? (
          <ProfileViewV5
            user={user}
            onProfileUpdate={onProfileUpdate}
          />
        ) : (
          <ProfileView
            user={user}
            onProfileUpdate={onProfileUpdate}
          />
        );
      case "settings":
        if (isV5_2 || isSettingsV5_2) {
          return (
            <SettingsViewV5_2
              user={user}
              onLogout={onLogout}
              onLogoutConfirmTrigger={() => setIsLogoutModalOpen(true)}
            />
          );
        }
        return (isV5 || isRecordsV5 || isInsightsV5 || isProfileV5 || isSettingsV5) ? (
          <SettingsViewV5
            user={user}
            onLogout={onLogout}
            onLogoutConfirmTrigger={() => setIsLogoutModalOpen(true)}
          />
        ) : (
          <SettingsView
            user={user}
            onLogout={onLogout}
            onLogoutConfirmTrigger={() => setIsLogoutModalOpen(true)}
          />
        );
      default:
        return <div>View not found</div>;
    }
  };

  const hasPatientPanel = user.role === "doctor" && activeTab === "doctor-visits";

  return (
    <div className={`dashboard-wrapper ${isSidebarCollapsed ? "sidebar-collapsed" : ""} ${isV5_2 || isRecordsV5_2 || isInsightsV5_2 || isProfileV5_2 || isSettingsV5_2 ? "dashboard--v5_2" : isV5_1 ? "dashboard--v5_1" : (isV5 || isRecordsV5 || isInsightsV5 || isProfileV5 || isSettingsV5) ? "dashboard--v5" : isV4 ? "dashboard--v4" : isV3 ? "dashboard--v3" : isV2 ? "dashboard--v2" : ""}`}>
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
            {isV5_2 || isRecordsV5_2 || isInsightsV5_2 || isProfileV5_2 || isSettingsV5_2 ? (
              <SidebarV5_2
                onLogout={onLogout}
                onLogoutConfirmTrigger={() => setIsLogoutModalOpen(true)}
                userRole={user.role}
                activeTab={activeTab === "dashboard" && (isRecordsV5_2 || isInsightsV5_2) ? (isRecordsV5_2 ? "trends" as TabType : "ai-insights" as TabType) : activeTab}
                onTabChange={handleTabChange}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
            ) : isV5_1 ? (
              <SidebarV5_1
                onLogout={onLogout}
                onLogoutConfirmTrigger={() => setIsLogoutModalOpen(true)}
                userRole={user.role}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
            ) : (isV5 || isRecordsV5 || isInsightsV5 || isProfileV5 || isSettingsV5) ? (
              <SidebarV5
                onLogout={onLogout}
                onLogoutConfirmTrigger={() => setIsLogoutModalOpen(true)}
                userRole={user.role}
                activeTab={activeTab === "dashboard" && isRecordsV5 ? "trends" as TabType : (activeTab === "dashboard" && isInsightsV5 ? "ai-insights" as TabType : activeTab)}
                onTabChange={handleTabChange}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
            ) : isV4 ? (
              <SidebarV4
                onLogout={onLogout}
                onLogoutConfirmTrigger={() => setIsLogoutModalOpen(true)}
                userRole={user.role}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
            ) : isV3 ? (
              <SidebarV3
                onLogout={onLogout}
                onLogoutConfirmTrigger={() => setIsLogoutModalOpen(true)}
                userRole={user.role}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
            ) : isV2 ? (
              <SidebarV2
                onLogout={onLogout}
                onLogoutConfirmTrigger={() => setIsLogoutModalOpen(true)}
                userRole={user.role}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
            ) : (
              <Sidebar
                onLogout={onLogout}
                onLogoutConfirmTrigger={() => setIsLogoutModalOpen(true)}
                userRole={user.role}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
            )}
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
          {/* Standard Page Header - shown only when not inside specific Patient Workspace */}
          {user.role === "doctor" && !workspacePatientId && (
            <div style={{ marginBottom: "28px" }}>
              <DashboardHeader userRole={user.role} username={user.username} />
            </div>
          )}

          {user.role === "patient" && (
            <div className="patient-top-header">
              <div className="patient-top-header__breadcrumb">
                {(isV5_1 || isV5_2 || isRecordsV5_2 || isInsightsV5_2 || isProfileV5_2 || isSettingsV5_2) ? (
                  <span className="breadcrumb-current">
                    {activeTab === "dashboard" ? "Home" : activeTab === "trends" ? "Health Records" : activeTab === "ai-insights" ? "Health Insights" : activeTab === "profile" ? "Profile" : "Settings"}
                  </span>
                ) : (
                  <>
                    <span className="breadcrumb-app">Portal</span>
                    <span className="breadcrumb-divider">/</span>
                    <span className="breadcrumb-current">
                      {activeTab === "dashboard" ? "Home" : activeTab === "trends" ? "Health Records" : activeTab === "ai-insights" ? "Health Insights" : activeTab === "profile" ? "Profile" : "Settings"}
                    </span>
                  </>
                )}
              </div>

              <div className="patient-top-header__actions">
                <a
                  href="mailto:support@mediflowai.com?subject=MediFlowAI%20Support%20Request"
                  className="patient-top-header__support-link"
                >
                  <span className="support-icon">?</span> Support
                </a>

                <div className="account-dropdown-container">
                  <button
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    className="account-dropdown-trigger"
                    type="button"
                    aria-label="Account menu"
                  >
                    <div className="account-avatar">
                      {(isV5_1 || isV5_2 || isRecordsV5_2 || isInsightsV5_2 || isProfileV5_2 || isSettingsV5_2) ? "W" : (user.fullName ? user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : user.username.slice(0, 2).toUpperCase())}
                    </div>
                    <span className="account-trigger-name">{user.fullName || user.username}</span>
                    <span className="account-trigger-chevron">▼</span>
                  </button>

                  {isAccountMenuOpen && (
                    <>
                      <div className="account-dropdown-backdrop" onClick={() => setIsAccountMenuOpen(false)} />
                      <div className="account-dropdown-menu">
                        <div className="account-dropdown-info">
                          <span className="account-dropdown-name">{user.fullName || user.username}</span>
                          <span className="account-dropdown-email">{user.email || "Patient Account"}</span>
                        </div>
                        <div className="account-dropdown-divider" />
                        <button
                          onClick={() => { handleTabChange("profile"); setIsAccountMenuOpen(false); }}
                          className="account-dropdown-item"
                          type="button"
                        >
                          👤 Profile
                        </button>
                        <button
                          onClick={() => { handleTabChange("settings"); setIsAccountMenuOpen(false); }}
                          className="account-dropdown-item"
                          type="button"
                        >
                          ⚙ Settings
                        </button>
                        <div className="account-dropdown-divider" />
                        <button
                          onClick={() => { setIsLogoutModalOpen(true); setIsAccountMenuOpen(false); }}
                          className="account-dropdown-item account-dropdown-item--danger"
                          type="button"
                        >
                          ⏻ Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
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
          ) : (!effectivePatientId && activeTab === "dashboard" && user.role !== "doctor" && user.role !== "admin") ? (
            <div className="dashboard__state-card" style={{ margin: "40px auto" }}>
              <h1>No patients found</h1>
              <p>Health records will appear here once a patient has submitted a measurement.</p>
            </div>
          ) : workspacePatientId ? (
            <PatientWorkspace
              patientId={workspacePatientId}
              encounterId={workspaceEncounterId}
              onBack={() => {
                setWorkspacePatientId(null);
                setWorkspaceEncounterId(null);
              }}
            />
          ) : (
            <>
              {renderActiveView()}
              {user.role === "patient" && (
                <footer className="patient-portal-footer">
                  <div className="patient-portal-footer__divider" />
                  <div className="patient-portal-footer__content">
                    <div className="patient-portal-footer__brand">
                      <span className="patient-portal-footer__logo">+</span>
                      <span className="patient-portal-footer__name">MediFlowAI</span>
                      <span className="patient-portal-footer__tagline">AI-powered health records, organized around you.</span>
                    </div>
                    <div className="patient-portal-footer__links">
                      <a href="#privacy" className="patient-portal-footer__link">Privacy</a>
                      <span className="patient-portal-footer__bullet">•</span>
                      <a href="#terms" className="patient-portal-footer__link">Terms</a>
                      <span className="patient-portal-footer__bullet">•</span>
                      <a href="mailto:support@mediflowai.com" className="patient-portal-footer__link">Support</a>
                      <span className="patient-portal-footer__bullet">•</span>
                      <span className="patient-portal-footer__copyright">© {new Date().getFullYear()} MediFlowAI</span>
                    </div>
                  </div>
                </footer>
              )}
            </>
          )}
        </main>

        <RecordSubmissionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />

        {isLogoutModalOpen && (
          <div className="modal-backdrop-premium" onClick={() => setIsLogoutModalOpen(false)}>
            <div className="modal-content-premium" onClick={e => e.stopPropagation()}>
              <div className="modal-header-premium">
                <span className="modal-icon-premium">⏻</span>
                <h2 className="modal-title-premium">Sign out of MediFlowAI?</h2>
              </div>
              <p className="modal-body-premium">
                You’ll need to sign in again to access your health records.
              </p>
              <div className="modal-actions-premium">
                <button
                  className="btn-premium btn-premium--secondary"
                  onClick={() => setIsLogoutModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="btn-premium btn-premium--danger"
                  onClick={() => {
                    setIsLogoutModalOpen(false);
                    if (onLogout) onLogout();
                  }}
                  type="button"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
