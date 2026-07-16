import React from "react";

interface DashboardHeaderProps {
  userRole?: "doctor" | "patient";
  username?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userRole, username }) => {
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const headingText = userRole === "patient"
    ? `Patient Portal - ${username}`
    : "Clinical Intelligence Dashboard";

  return (
    <header className="dashboard-header">
      <div>
        <p className="dashboard-header__eyebrow">MediFlowAI</p>
        <h1>{headingText}</h1>
      </div>
      <div className="dashboard-header__date" aria-label={`Today is ${currentDate}`}>
        <span className="dashboard-header__calendar" aria-hidden="true">▣</span>
        <span>{currentDate}</span>
      </div>
    </header>
  );
};

export default DashboardHeader;
