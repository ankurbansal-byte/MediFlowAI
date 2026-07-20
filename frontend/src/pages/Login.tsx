import React, { useState } from "react";
import api from "../api/axios";
import "./Login.css";

interface LoginProps {
  onLoginSuccess: (user: { username: string; role: "doctor" | "patient"; patientId?: string; isEmailVerified?: boolean }) => void;
  onOpenPatientRegister: () => void;
  onOpenDoctorRegister: () => void;
  onOpenForgotPassword: () => void;
}

interface LoginErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  onOpenPatientRegister,
  onOpenDoctorRegister,
  onOpenForgotPassword,
}) => {
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem("mediflow_remembered_username") || "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return !!localStorage.getItem("mediflow_remembered_username");
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        username: username.trim(),
        password,
      });

      if (response.data.success) {
        const { token, refreshToken, user } = response.data;

        localStorage.setItem("mediflow_token", token);
        localStorage.setItem("mediflow_refresh_token", refreshToken || "");
        localStorage.setItem("mediflow_user", JSON.stringify(user));

        if (rememberMe) {
          localStorage.setItem("mediflow_remembered_username", username.trim());
        } else {
          localStorage.removeItem("mediflow_remembered_username");
        }

        onLoginSuccess(user);
      } else {
        setError(response.data.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      const loginError = err as LoginErrorResponse;
      setError(
        loginError.response?.data?.message ||
          "Failed to connect to the server. Please verify the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo-mark">+</span>
          <h2>MediFlowAI</h2>
          <p>Clinical Intelligence & Patient Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error" role="alert">{error}</div>}

          <div className="login-form-group">
            <label htmlFor="username">Username, Email or Patient ID</label>
            <input
              id="username"
              type="text"
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. PAT-101 or user@email.com"
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="login-form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label htmlFor="password" style={{ margin: 0 }}>Password</label>
              <a
                href="#forgot-password"
                className="forgot-password-link"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenForgotPassword();
                }}
                style={{ fontSize: "12px", color: "#115e59", fontWeight: 600, textDecoration: "none" }}
              >
                Forgot Password?
              </a>
            </div>

            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="login-input"
                style={{ paddingRight: "40px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div className="remember-me-container" style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 12px 0" }}>
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
              style={{ cursor: "pointer", width: "16px", height: "16px" }}
            />
            <label htmlFor="rememberMe" style={{ fontSize: "13px", color: "#486581", cursor: "pointer", userSelect: "none", fontWeight: 600 }}>
              Remember Me on this device
            </label>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>

        <div className="login-footer" style={{ borderTop: "1px solid #e4e7eb", marginTop: "24px", paddingTop: "20px", textAlign: "center" }}>
          <p style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 600, color: "#486581" }}>Create Account</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              type="button"
              onClick={onOpenPatientRegister}
              disabled={loading}
              style={{
                backgroundColor: "#ffffff",
                color: "#115e59",
                border: "1.5px solid #115e59",
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
                width: "100%",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f0fdfa"; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#ffffff"; }}
            >
              Register as Patient
            </button>
            <button
              type="button"
              onClick={onOpenDoctorRegister}
              disabled={loading}
              style={{
                backgroundColor: "#115e59",
                color: "#ffffff",
                border: "none",
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
                width: "100%",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#0d4d49"; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#115e59"; }}
            >
              Register as Doctor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
