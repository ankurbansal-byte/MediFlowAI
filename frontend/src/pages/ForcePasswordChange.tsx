import React, { useState } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./Auth.css";

interface ForcePasswordChangeProps {
  user: User;
  onPasswordChanged: () => void;
  onLogout: () => void;
}

const ForcePasswordChange: React.FC<ForcePasswordChangeProps> = ({
  user,
  onPasswordChanged,
  onLogout,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Live password strength
  const getPasswordStrengthAndFeedback = () => {
    if (!newPassword) {
      return { strength: 0, feedback: "" };
    }

    let strength = 0;
    if (newPassword.length >= 8) strength += 1;
    if (/[A-Z]/.test(newPassword)) strength += 1;
    if (/[a-z]/.test(newPassword)) strength += 1;
    if (/[0-9]/.test(newPassword)) strength += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength += 1;

    let feedback = "";
    switch (strength) {
      case 1:
        feedback = "Very Weak";
        break;
      case 2:
        feedback = "Weak";
        break;
      case 3:
        feedback = "Medium";
        break;
      case 4:
        feedback = "Strong";
        break;
      case 5:
        feedback = "Very Strong";
        break;
    }

    return { strength, feedback };
  };

  const { strength: passwordStrength, feedback: passwordFeedback } = getPasswordStrengthAndFeedback();

  const getStrengthBarColor = () => {
    switch (passwordStrength) {
      case 1:
      case 2:
        return "#ef4444";
      case 3:
        return "#f59e0b";
      case 4:
      case 5:
        return "#0080ff";
      default:
        return "#e4e7eb";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError("Temporary password is required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (passwordStrength < 4) {
      setError("Please use a stronger password (at least 8 characters with uppercase, lowercase, digit, and special character).");
      return;
    }

    setLoading(true);

    try {
      const response = await api.put("/auth/profile", {
        oldPassword: currentPassword,
        newPassword: newPassword,
      });

      if (response.data.success) {
        setSuccess("Password changed successfully! Redirecting you...");
        setTimeout(() => {
          onPasswordChanged();
        }, 1500);
      } else {
        setError(response.data.message || "Failed to update password.");
      }
    } catch (err) {
      console.error("Password update error:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: "480px" }}>
        <div className="auth-header">
          <span className="auth-logo-mark">+</span>
          <h2>First-Time Login Verification</h2>
          <p>
            Welcome, <strong>{user.fullName || user.username}</strong>. As a newly enrolled {user.role === "doctor" ? "doctor" : "patient"}, you are required to change your temporary password before accessing the clinical telemetry workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error" role="alert">{error}</div>}
          {success && <div className="auth-success" role="alert">{success}</div>}

          <div className="auth-form-group">
            <label htmlFor="currentPassword">Temporary Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                className="auth-input"
                placeholder="Enter temporary password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: "#627d98",
                }}
              >
                {showCurrentPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div className="auth-form-group">
            <label htmlFor="newPassword">New Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                className="auth-input"
                placeholder="Choose a new strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: "#627d98",
                }}
              >
                {showNewPassword ? "🙈" : "👁"}
              </button>
            </div>

            {newPassword && (
              <div className="password-meter-container" style={{ marginTop: "10px" }}>
                <div className="password-meter-bar" style={{ height: "4px", backgroundColor: "#e4e7eb", borderRadius: "2px", overflow: "hidden" }}>
                  <div
                    className="password-meter-fill"
                    style={{
                      height: "100%",
                      width: `${(passwordStrength / 5) * 100}%`,
                      backgroundColor: getStrengthBarColor(),
                      transition: "width 0.2s ease",
                    }}
                  />
                </div>
                <span className="password-meter-text" style={{ fontSize: "0.78rem", fontWeight: 700, color: getStrengthBarColor(), marginTop: "4px", display: "inline-block" }}>
                  Strength: {passwordFeedback}
                </span>
              </div>
            )}
          </div>

          <div className="auth-form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="auth-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: "#627d98",
                }}
              >
                {showConfirmPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading} style={{ marginTop: "10px" }}>
            {loading ? "Updating Password..." : "Change Password & Log In"}
          </button>

          <button
            type="button"
            className="auth-cancel-btn"
            onClick={onLogout}
            disabled={loading}
            style={{ marginTop: "10px", width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#627d98", fontWeight: 600, cursor: "pointer" }}
          >
            Cancel & Sign Out
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
