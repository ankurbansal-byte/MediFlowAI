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
  // Initialize state using function expressions to avoid synchronous setStates in useEffect
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem("mediflow_remembered_username") || "";
  });
  const [password, setPassword] = useState("");
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

        // Save token and user details
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
              placeholder="e.g. doctor1, PAT-101 or user@email.com"
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
                style={{ fontSize: "12px", color: "#0080ff", fontWeight: 600, textDecoration: "none" }}
              >
                Forgot Password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
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

        <div className="login-footer" style={{ borderTop: "1px solid #e4e7eb", marginTop: "20px", paddingTop: "15px" }}>
          <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#627d98" }}>Don't have an account yet? Register:</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              onClick={onOpenPatientRegister}
              disabled={loading}
              style={{
                backgroundColor: "#ffffff",
                color: "#0080ff",
                border: "1.5px solid #0080ff",
                padding: "8px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#e6f2ff"; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#ffffff"; }}
            >
              Patient Sign Up
            </button>
            <button
              type="button"
              onClick={onOpenDoctorRegister}
              disabled={loading}
              style={{
                backgroundColor: "#0080ff",
                color: "#ffffff",
                border: "none",
                padding: "8px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#0066cc"; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#0080ff"; }}
            >
              Doctor Sign Up
            </button>
          </div>
        </div>

        <div className="login-footer" style={{ marginTop: "15px", fontSize: "11px", color: "#829ab1" }}>
          <p style={{ margin: "0 0 4px 0" }}>Demo Accounts:</p>
          <p style={{ margin: 0 }}><strong>Doctor:</strong> doctor1 / password</p>
          <p style={{ margin: 0 }}><strong>Patient:</strong> PAT-101 to PAT-106 / password</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
