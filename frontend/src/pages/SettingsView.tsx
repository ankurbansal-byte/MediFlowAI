import React, { useState } from "react";
import api from "../api/axios";
import { type User } from "../App";

interface SettingsViewProps {
  user: User;
  onLogout: () => void;
  onLogoutConfirmTrigger?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, onLogout, onLogoutConfirmTrigger }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setFeedback({ type: "error", message: "Please fill out all password fields." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", message: "New passwords do not match." });
      return;
    }

    setSaving(true);

    try {
      const response = await api.put("/auth/profile", {
        oldPassword,
        newPassword,
      });

      if (response.data.success) {
        setFeedback({
          type: "success",
          message: "Password updated successfully. Active sessions are secured."
        });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setFeedback({
          type: "error",
          message: response.data.message || "Failed to update password."
        });
      }
    } catch (err) {
      console.error("Change password error in settings:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setFeedback({
        type: "error",
        message: errRes?.message || "Password update failed. Please verify your current password."
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0" }}>
      {/* Header */}
      <div className="settings-header" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--color-border)", marginBottom: "28px" }}>
        <p className="summary-section__eyebrow" style={{ margin: 0, color: "var(--color-brand-primary)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>User Preferences</p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy)", fontSize: "1.6rem", fontWeight: 600, letterSpacing: "-0.02em" }}>Account Settings</h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
          Manage your Visual Interface, visual theme, security credentials, and active system sessions.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }} className="settings-grid-layout">

        {/* Left Column: Account, Theme & Session */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Account preferences */}
          <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--color-text-primary)", fontSize: "0.95rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Account Information
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <span style={{ display: "block", fontSize: "0.74rem", fontWeight: "600", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "4px" }}>Username / ID</span>
                <span style={{ fontSize: "0.92rem", fontWeight: "600", color: "var(--color-text-primary)" }}>{user.username}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.74rem", fontWeight: "600", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "4px" }}>Account Role</span>
                <span style={{
                  display: "inline-block",
                  fontSize: "0.72rem",
                  fontWeight: "600",
                  color: "var(--color-brand-primary)",
                  background: "var(--color-brand-bg-subtle)",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  textTransform: "uppercase",
                }}>
                  {user.role}
                </span>
              </div>
              {user.patientId && (
                <div>
                  <span style={{ display: "block", fontSize: "0.74rem", fontWeight: "600", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "4px" }}>Clinical Patient ID</span>
                  <span style={{ fontFamily: "monospace", fontSize: "0.9rem", fontWeight: "600", color: "var(--color-brand-primary)" }}>{user.patientId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Appearance (Theme Settings) */}
          <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ margin: "0 0 4px 0", color: "var(--color-text-primary)", fontSize: "0.95rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Appearance
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "var(--color-text-secondary)", fontSize: "0.82rem" }}>
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
                    borderRadius: "var(--radius-sm)",
                    border: theme === mode ? "2px solid var(--color-brand-primary)" : "1px solid var(--color-border)",
                    background: theme === mode ? "var(--color-brand-bg-subtle)" : "transparent",
                    color: theme === mode ? "var(--color-brand-primary)" : "var(--color-text-secondary)",
                    fontWeight: "600",
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

          {/* Session / Sign Out */}
          <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ margin: "0 0 4px 0", color: "var(--color-text-primary)", fontSize: "0.95rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Active Session
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "var(--color-text-secondary)", fontSize: "0.82rem" }}>
              Securely log out of your healthcare dashboard session on this browser.
            </p>
            <button
              type="button"
              onClick={onLogoutConfirmTrigger || onLogout}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: "var(--color-error)",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
            >
              Sign Out Securely
            </button>
          </div>

        </div>

        {/* Right Column: Security (Change Password Form) */}
        <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "24px", boxShadow: "var(--shadow-sm)" }}>
          <h3 style={{ margin: "0 0 6px 0", color: "var(--color-text-primary)", fontSize: "0.95rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Security
          </h3>
          <p style={{ margin: "0 0 20px 0", color: "var(--color-text-secondary)", fontSize: "0.82rem" }}>
            Update your account credentials to keep your longitudinal health records secure.
          </p>

          {feedback && (
            <div style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.82rem",
              fontWeight: "500",
              marginBottom: "18px",
              border: feedback.type === "success" ? "1px solid var(--color-brand-primary)" : "1px solid var(--color-error)",
              background: feedback.type === "success" ? "var(--color-success-bg)" : "var(--color-error-bg)",
              color: feedback.type === "success" ? "var(--color-brand-primary)" : "var(--color-error)",
            }}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label htmlFor="s-oldPass" style={{ fontSize: "0.74rem", fontWeight: "600", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Current Password</label>
              <input
                id="s-oldPass"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={saving}
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.88rem",
                  color: "var(--color-text-primary)",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label htmlFor="s-newPass" style={{ fontSize: "0.74rem", fontWeight: "600", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>New Password</label>
              <input
                id="s-newPass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={saving}
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.88rem",
                  color: "var(--color-text-primary)",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label htmlFor="s-confirmPass" style={{ fontSize: "0.74rem", fontWeight: "600", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Confirm New Password</label>
              <input
                id="s-confirmPass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={saving}
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.88rem",
                  color: "var(--color-text-primary)",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                marginTop: "8px",
                padding: "12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: "var(--color-brand-primary)",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "0.88rem",
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
            >
              {saving ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default SettingsView;
