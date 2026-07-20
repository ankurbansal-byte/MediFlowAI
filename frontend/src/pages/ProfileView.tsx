import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./Auth.css"; // Reuse modern CSS patterns

interface ProfileViewProps {
  user: User;
  onProfileUpdate: (updatedUser: User) => void;
}

interface ProfileData {
  username: string;
  role: "doctor" | "patient";
  patientId?: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  dob?: string;
  gender?: string;
  hospitalClinicName?: string;
  specialization?: string;
  yearsOfExperience?: string;
  address?: string;
  emergencyContact?: string;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onProfileUpdate }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  const [hospitalClinicName, setHospitalClinicName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");

  // Change password fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/auth/profile");
        if (response.data.success) {
          const data = response.data.profile;
          setProfile(data);

          setFullName(data.fullName || "");
          setEmail(data.email || "");
          setMobileNumber(data.mobileNumber || "");
          setDob(data.dob || "");
          setGender(data.gender || "");
          setAddress(data.address || "");
          setEmergencyContact(data.emergencyContact || "");

          setHospitalClinicName(data.hospitalClinicName || "");
          setSpecialization(data.specialization || "");
          setYearsOfExperience(data.yearsOfExperience || "");
        } else {
          setError(response.data.message || "Failed to load profile.");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("Unable to connect to the profile service.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload: Record<string, string | undefined> = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobileNumber: mobileNumber.trim(),
      };

      if (user.role === "patient") {
        payload.dob = dob;
        payload.gender = gender;
        payload.address = address.trim();
        payload.emergencyContact = emergencyContact.trim();
      } else {
        payload.hospitalClinicName = hospitalClinicName.trim();
        payload.specialization = specialization.trim();
        payload.yearsOfExperience = yearsOfExperience.trim();
      }

      const response = await api.put("/auth/profile", payload);
      if (response.data.success) {
        setSuccess("Profile information saved successfully.");
        setProfile((prev) => prev ? { ...prev, ...payload } : null);

        // Sync central user state (fullName, email etc)
        onProfileUpdate({
          ...user,
          fullName: payload.fullName,
          email: payload.email,
        });
      } else {
        setError(response.data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Save profile error:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordFeedback("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill out all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const response = await api.put("/auth/profile", {
        oldPassword,
        newPassword,
      });

      if (response.data.success) {
        setPasswordFeedback("Password changed successfully. Active sessions secured.");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(response.data.message || "Failed to update password.");
      }
    } catch (err) {
      console.error("Change password error:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setPasswordError(errRes?.message || "Password change failed. Verify your current password.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#0a2540" }}>
        <h3>Loading your clinical profile...</h3>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px" }}>
        <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
          Secure Portal Workspace
        </p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
          User Profile Management
        </h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
          Review, edit, and secure your personal records and system credentials.
        </p>
      </div>

      {/* Profile Core Block */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px" }} className="profile-grid-layout">

        {/* Left Column: Avatar & Account Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Avatar Placeholder Card */}
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "32px 24px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
          }}>
            <div style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              backgroundColor: "#e6f0ff",
              color: "#0080ff",
              fontSize: "48px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px auto",
              border: "3px solid #0080ff"
            }}>
              {fullName ? fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
            </div>

            <h3 style={{ margin: "0 0 4px 0", color: "var(--navy, #0a2540)", fontSize: "1.25rem", fontWeight: 850 }}>
              {fullName || "User Account"}
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#0080ff", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase" }}>
              {user.role} Portal
            </p>

            <div style={{
              display: "inline-block",
              background: "#f0f4f8",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "0.8rem",
              color: "#486581",
              fontWeight: 750
            }}>
              ID: {profile?.patientId || profile?.username}
            </div>
          </div>

          {/* Quick Stats/Meta */}
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
          }}>
            <h4 style={{ margin: "0 0 12px 0", color: "var(--navy, #0a2540)", fontSize: "0.95rem", fontWeight: 800, textTransform: "uppercase" }}>
              Security Details
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.88rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted, #486581)", fontWeight: 600 }}>Verification Status:</span>
                <span style={{ color: "#0080ff", fontWeight: 750 }}>✓ Verified Email</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted, #486581)", fontWeight: 600 }}>System Username:</span>
                <span style={{ color: "var(--navy, #0a2540)", fontWeight: 700, fontFamily: "monospace" }}>{profile?.username}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile & Password Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

          {/* General Information Form */}
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "28px",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
          }}>
            <h3 style={{ margin: "0 0 20px 0", color: "var(--navy, #0a2540)", fontSize: "1.2rem", fontWeight: 800, borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "10px" }}>
              General Information
            </h3>

            {error && <div className="auth-error" style={{ marginBottom: "16px" }} role="alert">{error}</div>}
            {success && <div className="auth-success" style={{ marginBottom: "16px" }} role="alert">{success}</div>}

            <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="auth-form-group">
                  <label htmlFor="p-fullName" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Full Name</label>
                  <input
                    id="p-fullName"
                    type="text"
                    className="auth-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="p-email" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Email Address</label>
                  <input
                    id="p-email"
                    type="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="auth-form-group">
                  <label htmlFor="p-mobileNumber" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Mobile Number</label>
                  <input
                    id="p-mobileNumber"
                    type="tel"
                    className="auth-input"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                {user.role === "patient" ? (
                  <div className="auth-form-group">
                    <label htmlFor="p-dob" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Date of Birth</label>
                    <input
                      id="p-dob"
                      type="date"
                      className="auth-input"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                ) : (
                  <div className="auth-form-group">
                    <label htmlFor="p-yearsExp" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Years of Experience</label>
                    <input
                      id="p-yearsExp"
                      type="text"
                      className="auth-input"
                      placeholder="e.g. 10 years"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                )}
              </div>

              {user.role === "patient" ? (
                <>
                  <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div className="auth-form-group">
                      <label htmlFor="p-gender" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Gender</label>
                      <select
                        id="p-gender"
                        className="auth-select"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        required
                        disabled={saving}
                        style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #cbd2d9", borderRadius: "8px" }}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="auth-form-group">
                      <label htmlFor="p-emergency" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Emergency Contact</label>
                      <input
                        id="p-emergency"
                        type="text"
                        className="auth-input"
                        placeholder="e.g. Jane Doe (+155512345)"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="p-address" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Home Address</label>
                    <input
                      id="p-address"
                      type="text"
                      className="auth-input"
                      placeholder="Street, City, State, ZIP"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </>
              ) : (
                <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="auth-form-group">
                    <label htmlFor="p-hospital" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Hospital / Clinic Name</label>
                    <input
                      id="p-hospital"
                      type="text"
                      className="auth-input"
                      value={hospitalClinicName}
                      onChange={(e) => setHospitalClinicName(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="p-specialization" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Specialization</label>
                    <input
                      id="p-specialization"
                      type="text"
                      className="auth-input"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="auth-submit-btn" style={{ padding: "14px", borderRadius: "8px", background: "#0080ff", color: "#ffffff", fontWeight: 750, border: "none", cursor: "pointer", transition: "all 0.15s ease", marginTop: "10px" }} disabled={saving}>
                {saving ? "Saving Changes..." : "Save Profile Details"}
              </button>
            </form>
          </div>

          {/* Change Password Block */}
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "28px",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
          }}>
            <h3 style={{ margin: "0 0 6px 0", color: "var(--navy, #0a2540)", fontSize: "1.25rem", fontWeight: 800 }}>
              Change Password
            </h3>
            <p style={{ margin: "0 0 20px 0", color: "var(--muted, #486581)", fontSize: "0.85rem" }}>
              Securely update your system credentials.
            </p>

            {passwordError && <div className="auth-error" style={{ marginBottom: "16px" }} role="alert">{passwordError}</div>}
            {passwordFeedback && <div className="auth-success" style={{ marginBottom: "16px" }} role="alert">{passwordFeedback}</div>}

            <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="auth-form-group">
                <label htmlFor="p-oldPass" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Current Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="p-oldPass"
                    type={showOldPassword ? "text" : "password"}
                    className="auth-input"
                    style={{ paddingRight: "40px" }}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    aria-label={showOldPassword ? "Hide password" : "Show password"}
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
                    {showOldPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="auth-form-group">
                  <label htmlFor="p-newPass" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>New Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="p-newPass"
                      type={showNewPassword ? "text" : "password"}
                      className="auth-input"
                      style={{ paddingRight: "40px" }}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={saving}
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
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {showNewPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                <div className="auth-form-group">
                  <label htmlFor="p-confirmPass" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Confirm New Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="p-confirmPass"
                      type={showConfirmPassword ? "text" : "password"}
                      className="auth-input"
                      style={{ paddingRight: "40px" }}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={saving}
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

              <button type="submit" className="auth-submit-btn" style={{ padding: "14px", borderRadius: "8px", background: "#ef4444", color: "#ffffff", fontWeight: 750, border: "none", cursor: "pointer", transition: "all 0.15s ease" }} disabled={saving}>
                {saving ? "Updating..." : "Update Password Credentials"}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProfileView;
