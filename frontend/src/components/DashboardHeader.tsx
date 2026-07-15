const DashboardHeader = () => {
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="dashboard-header">
      <div>
        <p className="dashboard-header__eyebrow">MediFlowAI</p>
        <h1>Doctor Dashboard</h1>
      </div>
      <div className="dashboard-header__date" aria-label={`Today is ${currentDate}`}>
        <span className="dashboard-header__calendar" aria-hidden="true">▣</span>
        <span>{currentDate}</span>
      </div>
    </header>
  );
};

export default DashboardHeader;
