import React from "react";

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

interface SidebarProps {
  onLogout?: () => void;
  userRole?: "doctor" | "patient";
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, userRole }) => {
  const filteredNavigationItems = userRole === "patient"
    ? navigationItems.filter(item => item.label !== "Patients")
    : navigationItems;

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark" aria-hidden="true">+</span>
        <span>MediFlowAI</span>
      </div>

      <nav className="sidebar__navigation">
        {filteredNavigationItems.map(({ label, icon, isActive }) => (
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
        {onLogout && (
          <button
            className="sidebar__link"
            type="button"
            onClick={onLogout}
            style={{
              marginTop: "auto",
              marginBottom: "16px",
              background: "none",
              border: "none",
              color: "#e11d48",
              cursor: "pointer",
              textAlign: "left",
              padding: "12px 16px",
              width: "100%",
              fontWeight: 500,
            }}
          >
            <span className="sidebar__icon" aria-hidden="true">⏾</span>
            Log Out
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="sidebar__support-icon" aria-hidden="true">?</span>
          <span>Need assistance?<small>Contact support</small></span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
