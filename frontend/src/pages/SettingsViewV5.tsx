import React, { useState } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./DashboardV5.css";

interface SettingsViewV5Props {
  user: User;
  onLogout: () => void;
  onLogoutConfirmTrigger?: () => void;
}

const EditorialTransition: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="v5-editorial-transition" style={{ padding: "16px 0" }}>
      <div className="v5-editorial-divider">
        <div className="v5-editorial-line"></div>
        <span className="v5-editorial-icon">✦</span>
        <span className="v5-editorial-badge">SETTINGS</span>
        <span className="v5-editorial-icon">✦</span>
        <div className="v5-editorial-line"></div>
      </div>
      <p className="v5-editorial-text" style={{ fontSize: "16px", maxWidth: "520px" }}>
        {text}
      </p>
    </div>
  );
};

const SettingsViewV5: React.FC<SettingsViewV5Props> = ({ user, onLogout, onLogoutConfirmTrigger }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Preference states with better toggles
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1.5px solid var(--v5-bg-cream)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--v5-text-dark)" }}>{label}</span>
          {sublabel && <span style={{ fontSize: "11px", color: "var(--v5-text-muted)" }}>{sublabel}</span>}
        </div>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          style={{
            background: checked ? "var(--v5-brand-green)" : "var(--v5-border-subtle)",
            width: "44px",
            height: "24px",
            borderRadius: "12px",
            position: "relative",
            border: "none",
            cursor: "pointer",
            transition: "background 0.2s"
          }}
        >
          <div style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "#FFFFFF",
            position: "absolute",
            top: "3px",
            left: checked ? "23px" : "3px",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
          }} />
        </button>
      </div>
    );
  };

  return (
    <div className="dashboard--v5 v5-mediflow-pattern" style={{ display: "flex", flexDirection: "column", gap: "32px", padding: "16px 24px" }}>

      {/* SECTION 1: HEADER */}
      <div className="v5-hero-wrapper" style={{ background: "#F3ECE2" }}>
        <div className="v5-hero" style={{ padding: "32px" }}>
          <p className="v5-eyebrow" style={{ color: "var(--v5-brand-orange)", margin: 0 }}>⚙️ User Preferences & Control</p>
          <h1 className="v5-display" style={{ fontSize: "28px", margin: "6px 0 4px 0" }}>Account & Dashboard Settings</h1>
          <p className="v5-body" style={{ color: "var(--v5-text-muted)", margin: 0 }}>
            Fine-tune clinical alerts, connected WhatsApp notification delivery, AI preferences, and security credentials.
          </p>
        </div>
      </div>

      <EditorialTransition text="“Your control panel. Secure, structured, and customized to your routine.”" />

      {/* Grid Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>

        {/* Left Column: Account, Appearance, Notifications, Privacy & AI Preferences */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* ACCOUNT CARD */}
          <div style={{
            background: "var(--v5-bg-white)",
            border: "1.5px solid var(--v5-border-subtle)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <h3 className="v5-section-heading" style={{ fontSize: "16px", marginBottom: "16px", borderBottom: "1.5px solid var(--v5-bg-cream)", paddingBottom: "10px" }}>
              👤 Account Profile Info
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--v5-text-muted)" }}>Username / Login ID:</span>
                <span style={{ color: "var(--v5-text-dark)", fontWeight: 600 }}>{user.username}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--v5-text-muted)" }}>Workspace Type:</span>
                <span style={{
                  color: "var(--v5-brand-orange)",
                  fontWeight: 700,
                  fontSize: "10px",
                  background: "#FFF0E0",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  textTransform: "uppercase"
                }}>{user.role} workspace</span>
              </div>
              {user.patientId && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--v5-text-muted)" }}>Patient ID Assignment:</span>
                  <span style={{ color: "var(--v5-brand-purple)", fontWeight: 600, fontFamily: "monospace" }}>{user.patientId}</span>
                </div>
              )}
            </div>
          </div>

          {/* APPEARANCE (THEME SETTINGS) */}
          <div style={{
            background: "var(--v5-bg-white)",
            border: "1.5px solid var(--v5-border-subtle)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <h3 className="v5-section-heading" style={{ fontSize: "16px", marginBottom: "4px" }}>
              🎨 Appearance Theme
            </h3>
            <p className="v5-body" style={{ color: "var(--v5-text-muted)", fontSize: "13px", marginBottom: "16px" }}>
              Customize the visual palette of the MediFlowAI patient workspace.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
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
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: theme === mode.key ? "2px solid var(--v5-brand-orange)" : "1.5px solid var(--v5-border-subtle)",
                    background: theme === mode.key ? "#FFF0E0" : "var(--v5-bg-cream)",
                    color: theme === mode.key ? "var(--v5-brand-orange)" : "var(--v5-text-muted)",
                    fontWeight: "600",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* NOTIFICATIONS GROUP */}
          <div style={{
            background: "var(--v5-bg-white)",
            border: "1.5px solid var(--v5-border-subtle)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <h3 className="v5-section-heading" style={{ fontSize: "16px", marginBottom: "12px" }}>
              🔔 Clinical Alerts & Notifications
            </h3>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <ToggleSwitch
                checked={notifWhatsApp}
                onChange={setNotifWhatsApp}
                label="WhatsApp Delivery Notifications"
                sublabel="Get instant save confirmation receipts on WhatsApp"
              />
              <ToggleSwitch
                checked={notifEmail}
                onChange={setNotifEmail}
                label="Email Verification Alerts"
                sublabel="Receive security flags or critical diagnostic changes via email"
              />
              <ToggleSwitch
                checked={notifWeekly}
                onChange={setNotifWeekly}
                label="Weekly Longitudinal Summaries"
                sublabel="A weekly recap report generated securely from your raw logs"
              />
            </div>
          </div>

          {/* PRIVACY CARD */}
          <div style={{
            background: "var(--v5-bg-white)",
            border: "1.5px solid var(--v5-border-subtle)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <h3 className="v5-section-heading" style={{ fontSize: "16px", marginBottom: "12px" }}>
              🔒 Patient Data & Privacy Guidelines
            </h3>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <ToggleSwitch
                checked={shareClinician}
                onChange={setShareClinician}
                label="Share Records with Certified Doctor Workspace"
                sublabel="Let hospital clinicians view your vitals and lab findings"
              />
              <ToggleSwitch
                checked={anonymizedResearch}
                onChange={setAnonymizedResearch}
                label="Anonymized Health Insights Research"
                sublabel="Opt-in to share fully de-identified stats for metadata science"
              />
            </div>
          </div>

          {/* AI PREFERENCES CARD */}
          <div style={{
            background: "var(--v5-bg-white)",
            border: "1.5px solid var(--v5-border-subtle)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <h3 className="v5-section-heading" style={{ fontSize: "16px", marginBottom: "12px" }}>
              ✦ Multimodal AI Preferences
            </h3>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <ToggleSwitch
                checked={aiSuggestions}
                onChange={setAiSuggestions}
                label="Empathetic Wellness Suggestion Engine"
                sublabel="Generate supportive health analytics with clinical safety guards"
              />
              <ToggleSwitch
                checked={voiceTranscripts}
                onChange={setVoiceTranscripts}
                label="Groq Whisper Voice Intelligence"
                sublabel="Transcribe, split, and extract observations from audio notes"
              />
            </div>
          </div>

        </div>

        {/* Right Column: Security (Change Password) & Danger Zone */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* SECURITY (CHANGE PASSWORD) */}
          <div style={{
            background: "var(--v5-bg-white)",
            border: "1.5px solid var(--v5-border-subtle)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <h3 className="v5-section-heading" style={{ fontSize: "16px", marginBottom: "6px" }}>
              🔒 Security & Credentials
            </h3>
            <p className="v5-body" style={{ color: "var(--v5-text-muted)", fontSize: "13px", marginBottom: "20px" }}>
              Keep your health history secure by periodically updating your password.
            </p>

            {feedback && (
              <div style={{
                padding: "12px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "500",
                marginBottom: "18px",
                border: feedback.type === "success" ? "1.5px solid var(--v5-brand-green)" : "1.5px solid var(--v5-brand-coral)",
                background: feedback.type === "success" ? "var(--v5-brand-green-light)" : "#FFE4E6",
                color: feedback.type === "success" ? "#065F46" : "var(--v5-brand-coral)",
              }}>
                {feedback.message}
              </div>
            )}

            <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="v5-eyebrow" style={{ display: "block" }}>Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={saving}
                  style={{
                    padding: "10px 12px",
                    border: "1.5px solid var(--v5-border-subtle)",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "var(--v5-text-dark)",
                    background: "var(--v5-bg-cream)",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="v5-eyebrow" style={{ display: "block" }}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={saving}
                  style={{
                    padding: "10px 12px",
                    border: "1.5px solid var(--v5-border-subtle)",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "var(--v5-text-dark)",
                    background: "var(--v5-bg-cream)",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="v5-eyebrow" style={{ display: "block" }}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={saving}
                  style={{
                    padding: "10px 12px",
                    border: "1.5px solid var(--v5-border-subtle)",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "var(--v5-text-dark)",
                    background: "var(--v5-bg-cream)",
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
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--v5-brand-orange)",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                {saving ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* DANGER ZONE */}
          <div style={{
            background: "#FFF5F5",
            border: "1.5px solid #FCA5A5",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <h3 className="v5-section-heading" style={{ fontSize: "16px", color: "var(--v5-brand-coral)", marginBottom: "6px" }}>
              ⚠️ Danger Zone
            </h3>
            <p className="v5-body" style={{ color: "var(--v5-text-muted)", fontSize: "13px", marginBottom: "16px" }}>
              Perform critical actions such as signing out of all connected browsers or closing your health records workspace.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                type="button"
                onClick={onLogoutConfirmTrigger || onLogout}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--v5-brand-coral)",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "background-color 0.15s",
                }}
              >
                Sign Out Securely
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default SettingsViewV5;
