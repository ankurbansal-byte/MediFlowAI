import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import "./Auth.css";

// Refactored VerifyEmail component for Enterprise Blue SaaS Redesign
interface VerifyEmailProps {
  tokenParam?: string;
  onVerifySuccess: () => void;
  onLogout: () => void;
  standalone?: boolean;
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({
  tokenParam,
  onVerifySuccess,
  onLogout,
  standalone = false,
}) => {
  // Direct state initialization
  const [token, setToken] = useState<string>(() => {
    return tokenParam || "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleVerify = useCallback(async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) {
      setError("Verification token is required.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/auth/verify-email", {
        token: tokenToVerify.trim(),
      });

      if (response.data.success) {
        setSuccess(response.data.message);

        // Update user cache in localStorage to preserve verified state
        const savedUserStr = localStorage.getItem("mediflow_user");
        if (savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            savedUser.isEmailVerified = true;
            localStorage.setItem("mediflow_user", JSON.stringify(savedUser));
          } catch (e) {
            console.error("Error updating verification cache", e);
          }
        }

        // Delay success trigger slightly for better visual feedback
        setTimeout(() => {
          onVerifySuccess();
        }, 1500);
      } else {
        setError(response.data.message || "Email verification failed.");
      }
    } catch (err) {
      console.error("Email verification error:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Verification failed. Please verify the token is correct.");
    } finally {
      setLoading(false);
    }
  }, [onVerifySuccess]);

  // Run auto-verification if token is present in URL on mount
  useEffect(() => {
    if (tokenParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleVerify(tokenParam);
    }
  }, [tokenParam, handleVerify]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(token);
  };

  return (
    <div className={standalone ? "auth-container" : "verification-overlay"}>
      <div className={standalone ? "auth-card" : "verification-overlay-card"}>
        <div className="auth-header">
          <span className="auth-logo-mark">📧</span>
          <h2>Verify Your Email</h2>
          <p>A verification email was sent to your inbox. Please enter the token below to activate your clinical workspace.</p>
        </div>

        {error && <div className="auth-error" role="alert">{error}</div>}
        {success && <div className="auth-success" role="alert"><strong>{success}</strong></div>}

        {!success && (
          <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "20px" }}>
            <div className="auth-form-group">
              <label htmlFor="verifyToken">Verification Token</label>
              <input
                id="verifyToken"
                type="text"
                className="auth-input"
                placeholder="Paste your email verification token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Verifying..." : "Verify Email Address"}
            </button>

            {!standalone && (
              <button type="button" className="auth-cancel-btn" onClick={onLogout} disabled={loading}>
                Logout & Exit
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
