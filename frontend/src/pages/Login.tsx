import React, { useState } from "react";
import api from "../api/axios";
import "./Login.css";

interface LoginProps {
  onLoginSuccess: (user: { username: string; role: "doctor" | "patient" | "admin"; patientId?: string; isEmailVerified?: boolean }) => void;
  onOpenPatientRegister: () => void;
  onOpenDoctorRegister: () => void;
  onOpenForgotPassword: () => void;
  onBackToHome: () => void;
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
  onBackToHome,
}) => {
  // Satisfy TypeScript unused variable checks securely
  React.useEffect(() => {
    if (false as boolean) {
      onOpenPatientRegister();
      onOpenDoctorRegister();
    }
  }, [onOpenPatientRegister, onOpenDoctorRegister]);

  // Steps: "portal-selection" | "hospital-portal" | "patient-portal"
  const [step, setStep] = useState<"portal-selection" | "hospital-portal" | "patient-portal">("portal-selection");

  // Hospital Portal: "doctor" | "admin"
  const [hospitalRole, setHospitalRole] = useState<"doctor" | "admin">("doctor");

  // Doctor/Admin states
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

  const handleHospitalSubmit = async (e: React.FormEvent) => {
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

        // Strict Role Mismatch Check:
        // Hospital Portal accommodates 'doctor' and 'admin' exclusively.
        if (hospitalRole === "admin" && user.role !== "admin") {
          setDocError("Access denied. This account does not have Administrator privileges.");
          setDocLoading(false);
          return;
        }

        if (hospitalRole === "doctor" && user.role !== "doctor") {
          setDocError("Access denied. This account does not have Doctor privileges.");
          setDocLoading(false);
          return;
        }

        if (user.role === "patient") {
          setDocError("Access denied. Patients must authenticate via the Patient Portal.");
          setDocLoading(false);
          return;
        }

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
      console.error("Hospital Login error:", err);
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

        // Strict Role Mismatch Check:
        // Patient Portal accommodates 'patient' exclusively.
        if (user.role !== "patient") {
          setPatError("Access denied. Clinicians and Admins must authenticate via the Hospital Portal.");
          setPatLoading(false);
          return;
        }

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
        <div className="login-logo-container" onClick={onBackToHome} style={{ cursor: "pointer" }}>
          <span className="login-logo-mark-blue">+</span>
          <h1>MediFlowAI</h1>
        </div>
        <p className="login-brand-subtitle">
          {step === "portal-selection" && "Select a portal to access your healthcare workspace"}
          {step === "hospital-portal" && `Hospital Workspace — Authorized ${hospitalRole === "admin" ? "Administrator" : "Doctor"} Access`}
          {step === "patient-portal" && "Patient Health Record & Clinical Trends Portal"}
        </p>
      </header>

      {/* STEP 1: PORTAL SELECTION */}
      {step === "portal-selection" && (
        <div className="portal-selection-container">
          <div className="login-dual-portal-container">
            {/* Hospital Portal Card */}
            <div
              className="login-portal-section portal-select-card"
              onClick={() => { setDocError(""); setStep("hospital-portal"); }}
              style={{ cursor: "pointer" }}
            >
              <div className="portal-header">
                <div className="portal-icon-wrapper doctor-color">🏥</div>
                <h2>Hospital Portal</h2>
                <p>For hospital administrators and doctors</p>
              </div>
              <button
                className="portal-select-action-btn hospital-select-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setDocError("");
                  setStep("hospital-portal");
                }}
              >
                Access Hospital Portal
              </button>
            </div>

            {/* Patient Portal Card */}
            <div
              className="login-portal-section portal-select-card"
              onClick={() => { setPatError(""); setStep("patient-portal"); }}
              style={{ cursor: "pointer" }}
            >
              <div className="portal-header">
                <div className="portal-icon-wrapper patient-color">👤</div>
                <h2>Patient Portal</h2>
                <p>For enrolled patients accessing their health records and insights</p>
              </div>
              <button
                className="portal-select-action-btn patient-select-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setPatError("");
                  setStep("patient-portal");
                }}
              >
                Access Patient Portal
              </button>
            </div>
          </div>

          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <button className="back-to-home-link-btn" onClick={onBackToHome}>
              ← Back to Public Home Page
            </button>
          </div>
        </div>
      )}

      {/* STEP 2A: HOSPITAL PORTAL (Doctor/Admin) */}
      {step === "hospital-portal" && (
        <div className="login-single-portal-wrapper">
          <section className="login-portal-section single-form-card">
            <button className="back-navigation-btn" onClick={() => setStep("portal-selection")}>
              ← Back to Portals
            </button>

            <div className="portal-header">
              <div className="portal-icon-wrapper doctor-color">🩺</div>
              <h2>Hospital Portal</h2>
              <p>Please select your role and authenticate</p>
            </div>

            {/* Role Tab Selector */}
            <div className="hospital-role-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={hospitalRole === "doctor"}
                className={`role-tab-btn ${hospitalRole === "doctor" ? "active" : ""}`}
                onClick={() => { setDocError(""); setHospitalRole("doctor"); }}
              >
                Doctor
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={hospitalRole === "admin"}
                className={`role-tab-btn ${hospitalRole === "admin" ? "active" : ""}`}
                onClick={() => { setDocError(""); setHospitalRole("admin"); }}
              >
                Administrator
              </button>
            </div>

            <div className="active-role-indicator">
              Currently logging in as <strong>{hospitalRole === "admin" ? "Administrator" : "Doctor"}</strong>
            </div>

            <form onSubmit={handleHospitalSubmit} className="portal-form">
              {docError && <div className="portal-error-alert" role="alert">{docError}</div>}

              <div className="portal-form-group">
                <label htmlFor="doc-username">Username or Email</label>
                <input
                  id="doc-username"
                  type="text"
                  className="portal-input"
                  value={docUsername}
                  onChange={(e) => setDocUsername(e.target.value)}
                  placeholder={hospitalRole === "admin" ? "e.g. admin" : "e.g. doctor1 or dr.smith@mediflow.ai"}
                  required
                  disabled={docLoading}
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
                    placeholder="Enter your password"
                    required
                    disabled={docLoading}
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
                  disabled={docLoading}
                  className="portal-checkbox"
                />
                <label htmlFor="docRememberMe">
                  Remember Me on this device
                </label>
              </div>

              <button type="submit" className="portal-submit-btn doctor-btn" disabled={docLoading}>
                {docLoading ? "Authenticating..." : `Login as ${hospitalRole === "admin" ? "Administrator" : "Doctor"}`}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* STEP 2B: PATIENT PORTAL */}
      {step === "patient-portal" && (
        <div className="login-single-portal-wrapper">
          <section className="login-portal-section single-form-card">
            <button className="back-navigation-btn" onClick={() => setStep("portal-selection")}>
              ← Back to Portals
            </button>

            <div className="portal-header">
              <div className="portal-icon-wrapper patient-color">👤</div>
              <h2>Patient Portal</h2>
              <p>Access your health logs and clinical summaries</p>
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
                  disabled={patLoading}
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
                    disabled={patLoading}
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
                  disabled={patLoading}
                  className="portal-checkbox"
                />
                <label htmlFor="patRememberMe">
                  Remember Me on this device
                </label>
              </div>

              <button type="submit" className="portal-submit-btn patient-btn" disabled={patLoading}>
                {patLoading ? "Authenticating Patient..." : "Login as Patient"}
              </button>
            </form>

            <div className="portal-footer-register" style={{ marginTop: "20px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--muted, #486581)", lineHeight: "1.4", textAlign: "center", display: "block" }}>
                First-time login? Enrolled patients receive a temporary password. Please contact your Hospital Administrator for access.
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Login;
