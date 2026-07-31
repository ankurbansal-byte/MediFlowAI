import React, { useState } from "react";
import api from "../api/axios";
import { type User } from "../App";

import "./SettingsViewV5_2.css";

interface SettingsViewV5_2Props {
  user: User;
  onLogout: () => void;
  onLogoutConfirmTrigger?: () => void;
}

const SettingsViewV5_2: React.FC<SettingsViewV5_2Props> = ({ user, onLogout, onLogoutConfirmTrigger }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Preference states
  const [theme, setTheme] = useState<"light" | "dark" | "system" | "cream">("cream");
  const [notifWhatsApp, setNotifWhatsApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);

  const [shareClinician, setShareClinician] = useState(true);
  const [anonymizedResearch, setAnonymizedResearch] = useState(false);

  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [voiceTranscripts, setVoiceTranscripts] = useState(true);

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

  const ToggleSwitch: React.FC<{ checked: boolean; onChange: (val: boolean) => void; label: string; sublabel?: string }> = ({ checked, onChange, label, sublabel }) => {
    return (
      <div className="v52-toggle-item-row">
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span className="v52-toggle-label">{label}</span>
          {sublabel && <span className="v52-toggle-sublabel">{sublabel}</span>}
        </div>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`v52-toggle-switch-btn ${checked ? "active" : ""}`}
        >
          <div className="v52-toggle-knob" />
        </button>
      </div>
    );
  };

  return (
    <div className="v52-settings-canvas">

      {/* SECTION 1: HEADER */}
      <section className="v52-hero-section">
        <div className="v52-hero-grid">
          <div className="v52-hero-content-column">
            <span className="v52-hero-eyebrow">
              ⚙️ User Preferences & Controls
            </span>
            <h1 className="v52-hero-title">
              Account & Security Controls
            </h1>
            <p className="v52-hero-body">
              Fine-tune clinical alerts, connected WhatsApp notification delivery, appearance themes, multimodal AI parameters, and security credentials.
            </p>
            <div className="v52-hero-id-badge" style={{ alignSelf: "flex-start" }}>
              Secure Control Hub
            </div>
          </div>

          <div className="v52-hero-visual-column">
            <div className="v52-storytelling-wrapper" style={{ gridTemplateColumns: "1fr" }}>
              <div className="v52-storytelling-card" style={{ padding: "20px" }}>
                <span className="v52-image-tag" style={{ background: "var(--v52-purple)" }}>Privacy Core</span>
                <p className="v52-image-caption" style={{ fontStyle: "italic", margin: 0 }}>
                  “Empowering patients with absolute transparency, granular data controls, and robust HIPAA-compliant infrastructure.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TWO-COLUMN CONFIGURATION GRID */}
      <div className="v52-settings-main-grid">

        {/* LEFT COLUMN: PREFERENCES GROUPED PANELS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

          {/* ACCOUNT INFO CARD */}
          <section className="v52-section-panel v52-bg-summary-panel" aria-labelledby="account-info-heading">
            <h3 id="account-info-heading" className="v52-panel-heading" style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
              👤 Account Space Details
            </h3>
            <div className="v52-settings-facts-stack">
              <div className="v52-settings-fact-row">
                <span className="key">Username / ID:</span>
                <strong className="val">{user.username}</strong>
              </div>
              <div className="v52-settings-fact-row">
                <span className="key">Workspace Access:</span>
                <strong className="val role-tag">{user.role} workspace</strong>
              </div>
              {user.patientId && (
                <div className="v52-settings-fact-row">
                  <span className="key">Patient ID:</span>
                  <strong className="val id-text">{user.patientId}</strong>
                </div>
              )}
            </div>
          </section>

          {/* APPEARANCE PALETTE THEME */}
          <section className="v52-section-panel v52-bg-trends-panel" aria-labelledby="theme-palette-heading">
            <h3 id="theme-palette-heading" className="v52-panel-heading" style={{ margin: "0 0 4px 0", fontSize: "18px" }}>
              🎨 Appearance Palette
            </h3>
            <p className="v52-panel-subtitle" style={{ marginBottom: "20px" }}>
              Fine-tune the workspace's visual density and layout theme style.
            </p>
            <div className="v52-theme-buttons-row">
              {([
                { key: "light", label: "☀️ Light" },
                { key: "cream", label: "✦ V5 Cream" },
                { key: "dark", label: "🌙 Dark" },
                { key: "system", label: "🖥️ System" }
              ] as const).map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setTheme(mode.key)}
                  className={`v52-theme-selector-btn ${theme === mode.key ? "active" : ""}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </section>

          {/* NOTIFICATION PREFERENCES */}
          <section className="v52-section-panel v52-bg-labs-panel" aria-labelledby="notification-heading">
            <h3 id="notification-heading" className="v52-panel-heading" style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
              🔔 Vitals Alerts & Logs Deliveries
            </h3>
            <div className="v52-toggles-container">
              <ToggleSwitch
                checked={notifWhatsApp}
                onChange={setNotifWhatsApp}
                label="WhatsApp Delivery Receipts"
                sublabel="Receive automated transaction confirmations via WhatsApp"
              />
              <ToggleSwitch
                checked={notifEmail}
                onChange={setNotifEmail}
                label="Critical Security Alerts"
                sublabel="Immediate notification on credentials change or security events"
              />
              <ToggleSwitch
                checked={notifWeekly}
                onChange={setNotifWeekly}
                label="Weekly Recaps"
                sublabel="A comprehensive longitudinal report generated dynamically"
              />
            </div>
          </section>

          {/* SECURITY & DATA PRIVACY */}
          <section className="v52-section-panel v52-bg-insights-panel" aria-labelledby="privacy-heading">
            <h3 id="privacy-heading" className="v52-panel-heading" style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
              🔒 Patient Data Governance
            </h3>
            <div className="v52-toggles-container">
              <ToggleSwitch
                checked={shareClinician}
                onChange={setShareClinician}
                label="Share Records with Clinicians"
                sublabel="Allow authorized treating hospital doctors to view records"
              />
              <ToggleSwitch
                checked={anonymizedResearch}
                onChange={setAnonymizedResearch}
                label="De-identified Science Logs"
                sublabel="Share anonymous aggregated vital statistics to help scientific studies"
              />
            </div>
          </section>

          {/* MULTIMODAL AI PREFERENCES */}
          <section className="v52-section-panel v52-bg-summary-panel" aria-labelledby="ai-preferences-heading">
            <h3 id="ai-preferences-heading" className="v52-panel-heading" style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
              ✦ Multimodal AI System Parameters
            </h3>
            <div className="v52-toggles-container">
              <ToggleSwitch
                checked={aiSuggestions}
                onChange={setAiSuggestions}
                label="Supportive Suggestion Engine"
                sublabel="Provide supportive contextual summaries safely"
              />
              <ToggleSwitch
                checked={voiceTranscripts}
                onChange={setVoiceTranscripts}
                label="Audio Voice Intelligence (Groq Whisper)"
                sublabel="Enable direct parsing of Hinglish/Hindi recorded voice messages"
              />
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: PASSWORDS UPDATE & DANGER SIGN OUT ZONE */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

          {/* PASSWORD CREDENTIALS SECURITY CARD */}
          <section className="v52-section-panel v52-bg-insights-panel" aria-labelledby="password-heading">
            <h3 id="password-heading" className="v52-panel-heading" style={{ margin: "0 0 6px 0", fontSize: "18px" }}>
              🔒 Credentials Security
            </h3>
            <p className="v52-panel-subtitle" style={{ marginBottom: "24px" }}>
              Maintain high clinical compliance by updating your active security credentials periodically.
            </p>

            {feedback && (
              <div className={`v52-settings-feedback-alert ${feedback.type}`}>
                {feedback.message}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="v52-settings-password-form">
              <div className="form-field">
                <label className="label">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={saving}
                  className="input"
                />
              </div>

              <div className="form-field">
                <label className="label">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={saving}
                  className="input"
                />
              </div>

              <div className="form-field">
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={saving}
                  className="input"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="submit-btn"
              >
                {saving ? "Securing..." : "Update Password"}
              </button>
            </form>
          </section>

          {/* DANGER ZONE PANEL */}
          <section className="v52-section-panel" style={{ background: "#FFF5F5", border: "1.5px solid #FCA5A5", borderTop: "4px solid var(--v52-rose)" }} aria-labelledby="danger-zone-heading">
            <h3 id="danger-zone-heading" className="v52-panel-heading" style={{ color: "var(--v52-rose)", margin: "0 0 6px 0", fontSize: "18px" }}>
              ⚠️ Danger Zone Controls
            </h3>
            <p className="v52-panel-subtitle" style={{ marginBottom: "20px" }}>
              Perform critical actions such as signing out of all active web sessions.
            </p>

            <button
              type="button"
              onClick={onLogoutConfirmTrigger || onLogout}
              className="danger-logout-btn"
            >
              Sign Out Securely
            </button>
          </section>

        </div>

      </div>

    </div>
  );
};

export default SettingsViewV5_2;
