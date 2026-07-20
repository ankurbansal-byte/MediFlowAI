import React, { useState } from "react";
import api from "../api/axios";
import "./Auth.css";

interface DoctorRegisterProps {
  onBackToLogin: () => void;
  onRegisterSuccess: (message: string, verificationToken?: string) => void;
}

const DoctorRegister: React.FC<DoctorRegisterProps> = ({ onBackToLogin, onRegisterSuccess }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [hospitalClinicName, setHospitalClinicName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Client-side quick checks
    const clientErrors: string[] = [];
    if (!fullName.trim()) clientErrors.push("Full Name is required.");
    if (!email.trim()) clientErrors.push("Email is required.");
    if (!mobileNumber.trim()) clientErrors.push("Mobile Number is required.");
    if (!hospitalClinicName.trim()) clientErrors.push("Hospital/Clinic Name is required.");
    if (!specialization.trim()) clientErrors.push("Specialization is required.");
    if (password !== confirmPassword) clientErrors.push("Passwords do not match.");
    if (password.length < 8) {
      clientErrors.push("Password must be at least 8 characters long.");
    }

    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/register/doctor", {
        fullName: fullName.trim(),
        email: email.trim(),
        mobileNumber: mobileNumber.trim(),
        hospitalClinicName: hospitalClinicName.trim(),
        specialization: specialization.trim(),
        password,
        confirmPassword,
      });

      if (response.data.success) {
        onRegisterSuccess(response.data.message, response.data.emailVerificationToken);
      } else {
        setErrors(response.data.errors || [response.data.message || "Doctor registration failed."]);
      }
    } catch (err) {
      console.error("Doctor Registration error:", err);
      const errRes = (err as { response?: { data?: { errors?: string[]; message?: string } } }).response?.data;
      setErrors(errRes?.errors || [errRes?.message || "Failed to connect to server."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <span className="auth-logo-mark">+</span>
          <h2>Clinical Provider Registration</h2>
          <p>Create your Doctor credential to access patient telemetry and AI diagnostics workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {errors.length > 0 && (
            <div className="auth-error" role="alert">
              <strong>Please fix the following validation errors:</strong>
              <ul className="auth-error-list">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="auth-form-row">
            <div className="auth-form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                className="auth-input"
                placeholder="e.g. Dr. Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="e.g. janesmith@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="auth-form-row">
            <div className="auth-form-group">
              <label htmlFor="mobileNumber">Mobile Number</label>
              <input
                id="mobileNumber"
                type="tel"
                className="auth-input"
                placeholder="e.g. +1234567890"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="hospitalName">Hospital / Clinic Name</label>
              <input
                id="hospitalName"
                type="text"
                className="auth-input"
                placeholder="e.g. St. Jude Clinical Center"
                value={hospitalClinicName}
                onChange={(e) => setHospitalClinicName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="auth-form-row">
            <div className="auth-form-group">
              <label htmlFor="specialization">Specialization</label>
              <input
                id="specialization"
                type="text"
                className="auth-input"
                placeholder="e.g. Cardiology, Diabetology"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="auth-form-row">
            <div className="auth-form-group">
              <label htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  style={{ paddingRight: "40px" }}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="new-password"
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

            <div className="auth-form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="auth-input"
                  style={{ paddingRight: "40px" }}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="new-password"
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
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showConfirmPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Registering Doctor Account..." : "Create Doctor Account"}
          </button>

          <button type="button" className="auth-cancel-btn" onClick={onBackToLogin} disabled={loading}>
            Cancel & Back to Login
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <a href="#login" onClick={(e) => { e.preventDefault(); onBackToLogin(); }}>
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DoctorRegister;
