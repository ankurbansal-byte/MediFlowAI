import React, { useState } from "react";
import api from "../api/axios";
import "./Auth.css";

interface ResetPasswordProps {
  tokenParam?: string;
  onBackToLogin: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ tokenParam, onBackToLogin }) => {
  // Directly initialize state using the prop, eliminating the useEffect entirely!
  const [token, setToken] = useState<string>(() => {
    return tokenParam || "";
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token.trim()) {
      setError("Reset token is required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/reset-password", {
        token: token.trim(),
        password,
        confirmPassword,
      });

      if (response.data.success) {
        setSuccess(response.data.message);
      } else {
        setError(response.data.message || "Failed to reset password.");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Failed to reset password. Please check your token or connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo-mark">🛡️</span>
          <h2>Set New Password</h2>
          <p>Please enter your reset token and your secure new password</p>
        </div>

        {error && <div className="auth-error" role="alert">{error}</div>}

        {success ? (
          <div className="auth-form" style={{ gap: "20px" }}>
            <div className="auth-success" role="alert">
              <strong>{success}</strong>
            </div>

            <button type="button" className="auth-submit-btn" onClick={onBackToLogin}>
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {!tokenParam && (
              <div className="auth-form-group">
                <label htmlFor="token">Reset Token</label>
                <input
                  id="token"
                  type="text"
                  className="auth-input"
                  placeholder="Paste secure token here"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="auth-form-group">
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                className="auth-input"
                placeholder="At least 8 characters with numbers/specials"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="auth-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Resetting password..." : "Reset Password"}
            </button>

            <button type="button" className="auth-cancel-btn" onClick={onBackToLogin} disabled={loading}>
              Cancel & Return to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
