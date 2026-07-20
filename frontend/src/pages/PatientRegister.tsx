import React, { useState } from "react";
import api from "../api/axios";
import "./Auth.css";

interface PatientRegisterProps {
  onBackToLogin: () => void;
  onRegisterSuccess: (message: string, patientId?: string, verificationToken?: string) => void;
}

const PatientRegister: React.FC<PatientRegisterProps> = ({ onBackToLogin, onRegisterSuccess }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Live password strength derived state
  const getPasswordStrengthAndFeedback = () => {
    if (!password) {
      return { strength: 0, feedback: "" };
    }

    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Client-side quick checks
    const clientErrors: string[] = [];
    if (!fullName.trim()) clientErrors.push("Full Name is required.");
    if (!email.trim()) clientErrors.push("Email is required.");
    if (!mobileNumber.trim()) clientErrors.push("Mobile Number is required.");
    if (!dob) clientErrors.push("Date of Birth is required.");
    if (!gender) clientErrors.push("Gender is required.");
    if (password !== confirmPassword) clientErrors.push("Passwords do not match.");
    if (passwordStrength < 4) {
      clientErrors.push("Please use a stronger password (at least 8 chars with uppercase, lowercase, digit, and special char).");
    }

    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/register/patient", {
        fullName: fullName.trim(),
        email: email.trim(),
        mobileNumber: mobileNumber.trim(),
        dob,
        gender,
        password,
        confirmPassword,
      });

      if (response.data.success) {
        onRegisterSuccess(
          response.data.message,
          response.data.patientId,
          response.data.emailVerificationToken
        );
      } else {
        setErrors(response.data.errors || [response.data.message || "Registration failed."]);
      }
    } catch (err) {
      console.error("Patient Registration error:", err);
      const errRes = (err as { response?: { data?: { errors?: string[]; message?: string } } }).response?.data;
      setErrors(errRes?.errors || [errRes?.message || "Failed to connect to server."]);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthBarColor = () => {
    switch (passwordStrength) {
      case 1:
      case 2:
        return "#e12d39"; // red
      case 3:
        return "#ff9c2a"; // orange
      case 4:
      case 5:
        return "#00a389"; // green
      default:
        return "#e4e7eb";
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-wide">
        <div className="auth-header">
          <span className="auth-logo-mark">+</span>
          <h2>Patient Portal Registration</h2>
          <p>Create your MediFlowAI account to manage your clinical telemetry and health records</p>
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
                placeholder="e.g. John Doe"
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
                placeholder="e.g. johndoe@example.com"
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

            <div className="auth-form-row">
              <div className="auth-form-group">
                <label htmlFor="dob">Date of Birth</label>
                <input
                  id="dob"
                  type="date"
                  className="auth-input"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="auth-form-group">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  className="auth-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  disabled={loading}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
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
              {password && (
                <div className="password-meter-container">
                  <div className="password-meter-bar">
                    <div
                      className="password-meter-fill"
                      style={{
                        width: `${(passwordStrength / 5) * 100}%`,
                        backgroundColor: getStrengthBarColor(),
                      }}
                    />
                  </div>
                  <span className="password-meter-text" style={{ color: getStrengthBarColor() }}>
                    Strength: {passwordFeedback}
                  </span>
                </div>
              )}
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
            {loading ? "Registering Patient Account..." : "Create Patient Account"}
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

export default PatientRegister;
