import React, { useState } from "react";
import { type User } from "../App";

interface SettingsViewProps {
  user: User;
  onLogout: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, onLogout }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setFeedback({ type: "error", message: "Please fill out all fields." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", message: "New password and confirmation password do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setFeedback({ type: "error", message: "New password must be at least 6 characters long." });
      return;
    }

    setFeedback({
      type: "success",
      message: "Password changed successfully! (Demo Mode: password updated locally for session)",
    });
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <>
      <div className="settings-header" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--line)", marginBottom: "28px" }}>
        <p className="summary-section__eyebrow" style={{ margin: 0, color: "#238b82", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>User Preferences</p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.03em" }}>Account Settings</h1>
        <p style={{ margin: "6px 0 0 0", color: "var(--muted)", fontSize: "0.95rem" }}>
          Manage your system profile, credentials, visual interface theme, and active session.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }} className="settings-grid-layout">

        {/* Left Column: Profile & Theme */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Profile Card */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(23, 49, 84, 0.03)" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--navy)", fontSize: "1.1rem", fontWeight: "800" }}>
              Profile Information
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <span style={{ display: "block", fontSize: "0.74rem", fontWeight: "750", color: "#7e8ba1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Username / ID</span>
                <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--navy)" }}>{user.username}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.74rem", fontWeight: "750", color: "#7e8ba1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Account Role</span>
                <span style={{
                  display: "inline-block",
                  fontSize: "0.76rem",
                  fontWeight: "800",
                  color: user.role === "doctor" ? "#115e59" : "#1e40af",
                  background: user.role === "doctor" ? "#e7f8f5" : "#eff6ff",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                }}>
                  {user.role}
                </span>
              </div>
              {user.patientId && (
                <div>
                  <span style={{ display: "block", fontSize: "0.74rem", fontWeight: "750", color: "#7e8ba1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Clinical Patient ID</span>
                  <span style={{ fontFamily: "monospace", fontSize: "1rem", fontWeight: "750", color: "#238b82" }}>{user.patientId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Theme Placeholder */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(23, 49, 84, 0.03)" }}>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--navy)", fontSize: "1.1rem", fontWeight: "800" }}>
              Theme Settings
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "var(--muted)", fontSize: "0.86rem" }}>
              Customize how MediFlowAI looks on your device.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              {(["light", "dark", "system"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: theme === mode ? "2px solid #238b82" : "1px solid var(--line)",
                    background: theme === mode ? "#e7f8f5" : "var(--surface)",
                    color: theme === mode ? "#115e59" : "var(--navy)",
                    fontWeight: "750",
                    fontSize: "0.82rem",
                    textTransform: "capitalize",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    outline: "none",
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Logout Section */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(23, 49, 84, 0.03)" }}>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--navy)", fontSize: "1.1rem", fontWeight: "800" }}>
              Terminate Session
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "var(--muted)", fontSize: "0.86rem" }}>
              Securely log out of your healthcare dashboard session on this browser.
            </p>
            <button
              type="button"
              onClick={onLogout}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                background: "#e11d48",
                color: "#ffffff",
                fontWeight: "750",
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#be123c")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#e11d48")}
            >
              Sign Out Securely
            </button>
          </div>

        </div>

        {/* Right Column: Demo Change Password Form */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "24px", boxShadow: "0 4px 16px rgba(23, 49, 84, 0.03)" }}>
          <h3 style={{ margin: "0 0 6px 0", color: "var(--navy)", fontSize: "1.1rem", fontWeight: "800" }}>
            Change Password
          </h3>
          <p style={{ margin: "0 0 20px 0", color: "var(--muted)", fontSize: "0.86rem" }}>
            Update your account credentials. For demo purposes, verification feedback is handled client-side.
          </p>

          {feedback && (
            <div style={{
              padding: "12px 14px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: "600",
              marginBottom: "18px",
              border: feedback.type === "success" ? "1px solid #99f6e4" : "1px solid #fca5a5",
              background: feedback.type === "success" ? "#f0fdfa" : "#fef2f2",
              color: feedback.type === "success" ? "#115e59" : "#991b1b",
            }}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: "750", color: "#7e8ba1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                style={{
                  padding: "10px 12px",
                  border: "1px solid #d5deeb",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  color: "var(--navy)",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: "750", color: "#7e8ba1", textTransform: "uppercase", letterSpacing: "0.05em" }}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  padding: "10px 12px",
                  border: "1px solid #d5deeb",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  color: "var(--navy)",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: "750", color: "#7e8ba1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  padding: "10px 12px",
                  border: "1px solid #d5deeb",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  color: "var(--navy)",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: "8px",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                background: "#238b82",
                color: "#ffffff",
                fontWeight: "750",
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#1a6f68")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#238b82")}
            >
              Update Password
            </button>
          </form>
        </div>

      </div>
    </>
  );
};

export default SettingsView;
