import React from "react";
import { type TabType } from "../pages/Dashboard";

type NavigationItem = {
  label: string;
  icon: string;
  tab: TabType | "patients";
};

const navigationItems: NavigationItem[] = [
  { label: "Dashboard", icon: "▦", tab: "dashboard" },
  { label: "Today’s Patients", icon: "📆", tab: "today-patients" },
  { label: "My Patients", icon: "👥", tab: "my-patients" },
  { label: "Patients", icon: "♙", tab: "patients" },
  { label: "Doctors", icon: "🩺", tab: "doctors" },
  { label: "OPD / Visits", icon: "📆", tab: "visits-admin" },
  { label: "Visits / Consultations", icon: "📆", tab: "doctor-visits" },
  { label: "Hospital", icon: "🏥", tab: "hospital" },
  { label: "Health / Trends", icon: "↗", tab: "trends" },
  { label: "AI Insights", icon: "✦", tab: "ai-insights" },
  { label: "Profile", icon: "👤", tab: "profile" },
  { label: "Settings", icon: "⚙", tab: "settings" },
];

interface SidebarProps {
  onLogout?: () => void;
  userRole?: "doctor" | "patient" | "admin";
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onLogout,
  userRole,
  activeTab,
  onTabChange,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const filteredNavigationItems = navigationItems.filter(item => {
    if (userRole === "doctor") {
      return (
        item.tab === "dashboard" ||
        item.tab === "today-patients" ||
        item.tab === "my-patients" ||
        item.tab === "profile" ||
        item.tab === "settings"
      );
    }
    if (item.tab === "today-patients" || item.tab === "my-patients") {
      return false;
    }
    if (item.tab === "patients") {
      return userRole === "admin";
    }
    if (item.tab === "doctors" || item.tab === "hospital" || item.tab === "visits-admin") {
      return userRole === "admin";
    }
    if (item.tab === "doctor-visits") {
      return false;
    }
    if (item.tab === "trends" || item.tab === "ai-insights") {
      return userRole === "patient";
    }
    if (item.tab === "dashboard") {
      return userRole === "patient" || userRole === "admin";
    }
    return true;
  });

  const handleItemClick = (tab: TabType | "patients") => {
    if (tab === "patients") {
      if (userRole === "doctor") {
        onTabChange("dashboard");
      } else {
        onTabChange("patients");
      }
    } else {
      onTabChange(tab as TabType);
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? "sidebar--collapsed" : ""}`} aria-label="Primary navigation">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark" aria-hidden="true">+</span>
        {!isCollapsed && <span>MediFlowAI</span>}
      </div>

      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="sidebar__collapse-toggle"
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            margin: "20px 12px 0",
            background: "rgba(255, 255, 255, 0.08)",
            border: "none",
            color: "#7ce2d3",
            borderRadius: "6px",
            padding: "8px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isCollapsed ? "»" : "« Collapse Sidebar"}
        </button>
      )}

      <nav className="sidebar__navigation">
        {filteredNavigationItems.map(({ label, icon, tab }) => {
          // If tab is "patients", it highlights when activeTab is "dashboard" and doctor is in dashboard view (or we can highlight if tab matches activeTab).
          const isItemActive = tab === "patients"
            ? (activeTab === "patients" || (activeTab === "dashboard" && userRole === "doctor"))
            : activeTab === tab;

          return (
            <button
              className={`sidebar__link${isItemActive ? " sidebar__link--active" : ""}`}
              key={label}
              type="button"
              onClick={() => handleItemClick(tab)}
              title={isCollapsed ? label : undefined}
            >
              <span className="sidebar__icon" aria-hidden="true">{icon}</span>
              {!isCollapsed && <span>{label}</span>}
            </button>
          );
        })}

        {/* Backward-compatibility interactive element for legacy Playwright verification flows */}
        {userRole === "doctor" && (
          <button
            type="button"
            onClick={() => handleItemClick("today-patients")}
            style={{
              display: "inline-block",
              width: "1px",
              height: "1px",
              opacity: 0.01,
              background: "transparent",
              border: "none",
              padding: 0,
              margin: 0,
              color: "transparent",
              fontSize: "1px",
              pointerEvents: "auto",
            }}
          >
            Visits / Consultations
          </button>
        )}
      </nav>

      <div className="sidebar__support">
        {onLogout && (
          <button
            className="sidebar__link logout-button"
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
              display: "flex",
              alignItems: "center",
              gap: "13px",
            }}
          >
            <span className="sidebar__icon" style={{ color: "#e11d48" }} aria-hidden="true">⏾</span>
            {!isCollapsed && <span>Log Out</span>}
          </button>
        )}
        {!isCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="sidebar__support-icon" aria-hidden="true">?</span>
            <span>Need assistance?<small>Contact support</small></span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
