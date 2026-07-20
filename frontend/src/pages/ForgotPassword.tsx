import React, { useState } from "react";
import api from "../api/axios";
import "./Auth.css";

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [testResetLink, setTestResetLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setTestResetLink("");
    setLoading(true);

    try {
      const response = await api.post("/auth/forgot-password", {
        email: email.trim(),
      });

      if (response.data.success) {
        setSuccessMsg(response.data.message);
        if (response.data.passwordResetToken) {
          // Expose resetting URL in developer sandbox mode for easy testing
          setTestResetLink(`http://localhost:5173/?view=reset-password&token=${response.data.passwordResetToken}`);
        }
      } else {
        setError(response.data.message || "Something went wrong.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Failed to reach servers.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo-mark">🔑</span>
          <h2>Reset Password</h2>
          <p>We will email you instructions to reset your password</p>
        </div>

        {error && <div className="auth-error" role="alert">{error}</div>}

        {successMsg ? (
          <div className="auth-form" style={{ gap: "20px" }}>
            <div className="auth-success" role="alert">
              <strong>{successMsg}</strong>
              {testResetLink && (
                <div style={{ marginTop: "12px", borderTop: "1px solid rgba(0, 128, 255, 0.2)", paddingTop: "10px" }}>
                  <p style={{ margin: "0 0 6px 0", fontWeight: "bold", color: "#0080ff" }}>🔧 Dev Testing Link:</p>
                  <a
                    href={testResetLink}
                    style={{ color: "#0066cc", fontWeight: "bold", wordBreak: "break-all" }}
                    onClick={(e) => {
                      e.preventDefault();
                      // Redirect to the view manually
                      window.location.href = testResetLink;
                    }}
                  >
                    Click here to Reset Password
                  </a>
                </div>
              )}
            </div>

            <button type="button" className="auth-submit-btn" onClick={onBackToLogin}>
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="your-registered-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Sending reset link..." : "Send Reset Link"}
            </button>

            <button type="button" className="auth-cancel-btn" onClick={onBackToLogin} disabled={loading}>
              Cancel & Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
