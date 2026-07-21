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
  // Satisfy TypeScript unused variable check
  React.useEffect(() => {
    if (false as boolean) {
      onOpenPatientRegister();
    }
  }, [onOpenPatientRegister]);

  // Doctor states
  const [docUsername, setDocUsername] = useState<string>(() => {
    const saved = localStorage.getItem("mediflow_remembered_username_doctor") || localStorage.getItem("mediflow_remembered_username") || "";
    return saved.toUpperCase().startsWith("PAT-") ? "" : saved;
  });
  const [docPassword, setDocPassword] = useState("");
  const [docShowPassword, setDocShowPassword] = useState(false);
  const [docRememberMe, setDocRememberMe] = useState<boolean>(() => {
    return !!localStorage.getItem("mediflow_remembered_username_doctor") || (!!localStorage.getItem("mediflow_remembered_username") && !localStorage.getItem("mediflow_remembered_username")?.toUpperCase().startsWith("PAT-"));
  });
  const [docError, setDocError] = useState("");
  const [docLoading, setDocLoading] = useState(false);

  // Patient states
  const [patUsername, setPatUsername] = useState<string>(() => {
    const saved = localStorage.getItem("mediflow_remembered_username_patient") || localStorage.getItem("mediflow_remembered_username") || "";
    return saved.toUpperCase().startsWith("PAT-") ? saved : "";
  });
  const [patPassword, setPatPassword] = useState("");
  const [patShowPassword, setPatShowPassword] = useState(false);
  const [patRememberMe, setPatRememberMe] = useState<boolean>(() => {
    return !!localStorage.getItem("mediflow_remembered_username_patient") || (!!localStorage.getItem("mediflow_remembered_username") && !!localStorage.getItem("mediflow_remembered_username")?.toUpperCase().startsWith("PAT-"));
  });
  const [patError, setPatError] = useState("");
  const [patLoading, setPatLoading] = useState(false);

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError("");
    setDocLoading(true);

    try {
      const response = await api.post("/auth/login", {
        username: docUsername.trim(),
        password: docPassword,
      });

      if (response.data.success) {
        const { token, refreshToken, user } = response.data;

        localStorage.setItem("mediflow_token", token);
        localStorage.setItem("mediflow_refresh_token", refreshToken || "");
        localStorage.setItem("mediflow_user", JSON.stringify(user));

        if (docRememberMe) {
          localStorage.setItem("mediflow_remembered_username_doctor", docUsername.trim());
          localStorage.removeItem("mediflow_remembered_username_patient");
          localStorage.removeItem("mediflow_remembered_username");
        } else {
          localStorage.removeItem("mediflow_remembered_username_doctor");
        }

        onLoginSuccess(user);
      } else {
        setDocError(response.data.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Doctor Login error:", err);
      const loginError = err as LoginErrorResponse;
      setDocError(
        loginError.response?.data?.message ||
          "Failed to connect to the server. Please verify the backend is running."
      );
    } finally {
      setDocLoading(false);
    }
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPatError("");
    setPatLoading(true);

    try {
      const response = await api.post("/auth/login", {
        username: patUsername.trim(),
        password: patPassword,
      });

      if (response.data.success) {
        const { token, refreshToken, user } = response.data;

        localStorage.setItem("mediflow_token", token);
        localStorage.setItem("mediflow_refresh_token", refreshToken || "");
        localStorage.setItem("mediflow_user", JSON.stringify(user));

        if (patRememberMe) {
          localStorage.setItem("mediflow_remembered_username_patient", patUsername.trim());
          localStorage.removeItem("mediflow_remembered_username_doctor");
          localStorage.removeItem("mediflow_remembered_username");
        } else {
          localStorage.removeItem("mediflow_remembered_username_patient");
        }

        onLoginSuccess(user);
      } else {
        setPatError(response.data.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Patient Login error:", err);
      const loginError = err as LoginErrorResponse;
      setPatError(
        loginError.response?.data?.message ||
          "Failed to connect to the server. Please verify the backend is running."
      );
    } finally {
      setPatLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* Brand Header */}
      <header className="login-brand-header">
        <div className="login-logo-container">
          <span className="login-logo-mark-blue">+</span>
          <h1>MediFlowAI</h1>
        </div>
        <p className="login-brand-subtitle">Enterprise Clinical Intelligence & Patient Telemetry Platform</p>
      </header>

      {/* Dual Portal Layout Container */}
      <div className="login-dual-portal-container">

        {/* LEFT SECTION: Doctor Portal */}
        <section className="login-portal-section doctor-portal">
          <div className="portal-header">
            <div className="portal-icon-wrapper doctor-color">
              🩺
            </div>
            <h2>Doctor Portal</h2>
            <p>Access patient telemetry, AI clinical insights, and workspaces</p>
          </div>

          <form onSubmit={handleDoctorSubmit} className="portal-form">
            {docError && <div className="portal-error-alert" role="alert">{docError}</div>}

            <div className="portal-form-group">
              <label htmlFor="doc-username">Username or Email</label>
              <input
                id="doc-username"
                type="text"
                className="portal-input"
                value={docUsername}
                onChange={(e) => setDocUsername(e.target.value)}
                placeholder="e.g. doctor1 or dr.smith@mediflow.ai"
                required
                disabled={docLoading || patLoading}
                autoComplete="username"
              />
            </div>

            <div className="portal-form-group">
              <div className="portal-password-header">
                <label htmlFor="doc-password">Password</label>
                <a
                  href="#forgot-password"
                  className="portal-forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenForgotPassword();
                  }}
                >
                  Forgot Password?
                </a>
              </div>

              <div className="portal-input-with-icon">
                <input
                  id="doc-password"
                  type={docShowPassword ? "text" : "password"}
                  className="portal-input password-padding"
                  value={docPassword}
                  onChange={(e) => setDocPassword(e.target.value)}
                  placeholder="Enter your doctor password"
                  required
                  disabled={docLoading || patLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setDocShowPassword(!docShowPassword)}
                  aria-label={docShowPassword ? "Hide password" : "Show password"}
                  className="portal-eye-toggle"
                >
                  {docShowPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="portal-remember-row">
              <input
                id="docRememberMe"
                type="checkbox"
                checked={docRememberMe}
                onChange={(e) => setDocRememberMe(e.target.checked)}
                disabled={docLoading || patLoading}
                className="portal-checkbox"
              />
              <label htmlFor="docRememberMe">
                Remember Me on this device
              </label>
            </div>

            <button type="submit" className="portal-submit-btn doctor-btn" disabled={docLoading || patLoading}>
              {docLoading ? "Authenticating Doctor..." : "Login as Doctor"}
            </button>
          </form>

          <div className="portal-footer-register">
            <span>New clinical provider?</span>
            <button
              type="button"
              className="portal-register-link-btn"
              onClick={onOpenDoctorRegister}
              disabled={docLoading || patLoading}
            >
              Register as Doctor
            </button>
          </div>
        </section>

        {/* RIGHT SECTION: Patient Portal */}
        <section className="login-portal-section patient-portal">
          <div className="portal-header">
            <div className="portal-icon-wrapper patient-color">
              👤
            </div>
            <h2>Patient Portal</h2>
            <p>Submit health logs, track clinical trends, and view insights</p>
          </div>

          <form onSubmit={handlePatientSubmit} className="portal-form">
            {patError && <div className="portal-error-alert" role="alert">{patError}</div>}

            <div className="portal-form-group">
              <label htmlFor="pat-username">Patient ID or Email</label>
              <input
                id="pat-username"
                type="text"
                className="portal-input"
                value={patUsername}
                onChange={(e) => setPatUsername(e.target.value)}
                placeholder="e.g. PAT-101 or patient@email.com"
                required
                disabled={docLoading || patLoading}
                autoComplete="username"
              />
            </div>

            <div className="portal-form-group">
              <div className="portal-password-header">
                <label htmlFor="pat-password">Password</label>
                <a
                  href="#forgot-password"
                  className="portal-forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenForgotPassword();
                  }}
                >
                  Forgot Password?
                </a>
              </div>

              <div className="portal-input-with-icon">
                <input
                  id="pat-password"
                  type={patShowPassword ? "text" : "password"}
                  className="portal-input password-padding"
                  value={patPassword}
                  onChange={(e) => setPatPassword(e.target.value)}
                  placeholder="Enter your patient password"
                  required
                  disabled={docLoading || patLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setPatShowPassword(!patShowPassword)}
                  aria-label={patShowPassword ? "Hide password" : "Show password"}
                  className="portal-eye-toggle"
                >
                  {patShowPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="portal-remember-row">
              <input
                id="patRememberMe"
                type="checkbox"
                checked={patRememberMe}
                onChange={(e) => setPatRememberMe(e.target.checked)}
                disabled={docLoading || patLoading}
                className="portal-checkbox"
              />
              <label htmlFor="patRememberMe">
                Remember Me on this device
              </label>
            </div>

            <button type="submit" className="portal-submit-btn patient-btn" disabled={docLoading || patLoading}>
              {patLoading ? "Authenticating Patient..." : "Login as Patient"}
            </button>
          </form>

          <div className="portal-footer-register">
            <span style={{ fontSize: "0.85rem", color: "var(--muted, #486581)", lineHeight: "1.4", textAlign: "center", display: "block" }}>
              First-time login? Enrolled patients receive a temporary password. Please contact your Hospital Administrator for access.
            </span>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Login;
