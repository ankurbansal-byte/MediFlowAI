type NavigationItem = {
  label: string;
  icon: string;
  isActive?: boolean;
};

const navigationItems: NavigationItem[] = [
  { label: "Dashboard", icon: "▦", isActive: true },
  { label: "Patients", icon: "♙" },
  { label: "Trends", icon: "↗" },
  { label: "AI Insights", icon: "✦" },
  { label: "Settings", icon: "⚙" },
];

const Sidebar = () => (
  <aside className="sidebar" aria-label="Primary navigation">
    <div className="sidebar__brand">
      <span className="sidebar__brand-mark" aria-hidden="true">+</span>
      <span>MediFlowAI</span>
    </div>

    <nav className="sidebar__navigation">
      {navigationItems.map(({ label, icon, isActive }) => (
        <button
          className={`sidebar__link${isActive ? " sidebar__link--active" : ""}`}
          key={label}
          type="button"
        >
          <span className="sidebar__icon" aria-hidden="true">{icon}</span>
          {label}
        </button>
      ))}
    </nav>

    <div className="sidebar__support">
      <span className="sidebar__support-icon" aria-hidden="true">?</span>
      <span>Need assistance?<small>Contact support</small></span>
    </div>
  </aside>
);

export default Sidebar;
