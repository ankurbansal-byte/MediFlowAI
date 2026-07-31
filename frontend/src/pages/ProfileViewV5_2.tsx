import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";

// Import project assets naturally to blend into the storytelling
import cloudPlatformFlow from "../assets/images/cloud-platform-flow.png";

import "./ProfileViewV5_2.css";

interface ProfileViewV5_2Props {
  user: User;
  onProfileUpdate: (updatedUser: User) => void;
}

interface ProfileData {
  username: string;
  role: "doctor" | "patient" | "admin";
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

const ProfileViewV5_2: React.FC<ProfileViewV5_2Props> = ({ user, onProfileUpdate }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);

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
          setGender(data.gender || "Male");
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
        setIsEditing(false);

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

  const cancelEditing = () => {
    if (profile) {
      setFullName(profile.fullName || "");
      setEmail(profile.email || "");
      setMobileNumber(profile.mobileNumber || "");
      setDob(profile.dob || "");
      setGender(profile.gender || "Male");
      setAddress(profile.address || "");
      setEmergencyContact(profile.emergencyContact || "");
      setHospitalClinicName(profile.hospitalClinicName || "");
      setSpecialization(profile.specialization || "");
      setYearsOfExperience(profile.yearsOfExperience || "");
    }
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  if (loading) {
    return (
      <div className="v52-profile-canvas" style={{ padding: "40px", textAlign: "center", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="v52-profile-loading-text">
          Loading your personalized V5.2 clinical profile...
        </p>
      </div>
    );
  }

  return (
    <div className="v52-profile-canvas">

      {/* SECTION 1: PREMIUM HERO HEADER */}
      <section className="v52-hero-section">
        <div className="v52-hero-grid">
          <div className="v52-hero-content-column">
            <span className="v52-hero-eyebrow">
              ⚡ Medical Informatics Ecosystem V5.2
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "12px", flexWrap: "wrap" }}>
              <div className="v52-profile-avatar-circle">
                {fullName ? fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="v52-profile-role-tag">{user.role} workspace</span>
                <h1 className="v52-hero-title" style={{ margin: 0, fontSize: "28px" }}>
                  {fullName || user.username}
                </h1>
                <p className="v52-profile-subheading-text">
                  Clinical Workspace Identity Portal
                </p>
              </div>
            </div>
            <div className="v52-hero-id-badge" style={{ marginTop: "20px" }}>
              Workspace ID: {user.patientId || user.username}
            </div>
          </div>

          <div className="v52-hero-visual-column">
            <div className="v52-storytelling-wrapper" style={{ gridTemplateColumns: "1fr" }}>
              <div className="v52-storytelling-card" style={{ padding: "20px" }}>
                <span className="v52-image-tag" style={{ background: "var(--v52-orange)" }}>Platform Node</span>
                <img src={cloudPlatformFlow} alt="Connected Cloud Infrastructure" className="v52-storytelling-image" style={{ height: "130px" }} />
                <p className="v52-image-caption">Clinical space connection ensuring strict compliance boundaries, end-to-end data encryption, and robust PHI isolation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN TWO-COLUMN GRID */}
      <div className="v52-profile-main-grid">

        {/* LEFT COLUMN: PERSONAL DETAILS PANEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {error && (
            <div className="v52-profile-feedback-alert error">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="v52-profile-feedback-alert success">
              ✓ {success}
            </div>
          )}

          {/* PERSONAL INFORMATION PANEL */}
          <section className="v52-section-panel v52-bg-summary-panel" aria-labelledby="personal-info-heading">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #FFE0B2", paddingBottom: "14px", marginBottom: "24px" }}>
              <h2 id="personal-info-heading" className="v52-panel-heading" style={{ margin: 0, fontSize: "20px" }}>
                👤 Personal Details
              </h2>

              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="v52-profile-edit-trigger-btn"
                >
                  ✏️ Edit Details
                </button>
              ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="v52-profile-edit-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProfileSave}
                    type="submit"
                    className="v52-profile-edit-save-btn"
                  >
                    Save Vitals
                  </button>
                </div>
              )}
            </div>

            {!isEditing ? (
              <div className="v52-profile-info-grid">
                <div className="v52-profile-info-block">
                  <span className="v52-profile-info-label">Full Name</span>
                  <strong className="v52-profile-info-value">{profile?.fullName || "—"}</strong>
                </div>
                <div className="v52-profile-info-block">
                  <span className="v52-profile-info-label">Email Address</span>
                  <strong className="v52-profile-info-value" style={{ textTransform: "none" }}>{profile?.email || "—"}</strong>
                </div>
                <div className="v52-profile-info-block">
                  <span className="v52-profile-info-label">Mobile Number</span>
                  <strong className="v52-profile-info-value">{profile?.mobileNumber || "—"}</strong>
                </div>
                <div className="v52-profile-info-block">
                  <span className="v52-profile-info-label">Date of Birth</span>
                  <strong className="v52-profile-info-value">{profile?.dob || "—"}</strong>
                </div>
                <div className="v52-profile-info-block">
                  <span className="v52-profile-info-label">Gender</span>
                  <strong className="v52-profile-info-value">{profile?.gender || "—"}</strong>
                </div>
                <div className="v52-profile-info-block">
                  <span className="v52-profile-info-label">Emergency Contact</span>
                  <strong className="v52-profile-info-value">{profile?.emergencyContact || "—"}</strong>
                </div>

                {user.role === "patient" ? (
                  <div className="v52-profile-info-block full-width">
                    <span className="v52-profile-info-label">Home Address</span>
                    <strong className="v52-profile-info-value">{profile?.address || "—"}</strong>
                  </div>
                ) : (
                  <>
                    <div className="v52-profile-info-block">
                      <span className="v52-profile-info-label">Hospital/Clinic</span>
                      <strong className="v52-profile-info-value">{profile?.hospitalClinicName || "—"}</strong>
                    </div>
                    <div className="v52-profile-info-block">
                      <span className="v52-profile-info-label">Specialization</span>
                      <strong className="v52-profile-info-value">{profile?.specialization || "—"}</strong>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="v52-profile-form-grid">
                <div className="v52-profile-form-field">
                  <label className="v52-profile-input-label">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="v52-profile-form-input"
                  />
                </div>

                <div className="v52-profile-form-field">
                  <label className="v52-profile-input-label">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="v52-profile-form-input"
                  />
                </div>

                <div className="v52-profile-form-field">
                  <label className="v52-profile-input-label">Mobile Number</label>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    className="v52-profile-form-input"
                  />
                </div>

                <div className="v52-profile-form-field">
                  <label className="v52-profile-input-label">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="v52-profile-form-input"
                  />
                </div>

                <div className="v52-profile-form-field">
                  <label className="v52-profile-input-label">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="v52-profile-form-select"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="v52-profile-form-field">
                  <label className="v52-profile-input-label">Emergency Contact</label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="v52-profile-form-input"
                  />
                </div>

                {user.role === "patient" ? (
                  <div className="v52-profile-form-field full-width">
                    <label className="v52-profile-input-label">Home Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="v52-profile-form-input"
                    />
                  </div>
                ) : (
                  <>
                    <div className="v52-profile-form-field">
                      <label className="v52-profile-input-label">Hospital/Clinic Name</label>
                      <input
                        type="text"
                        value={hospitalClinicName}
                        onChange={(e) => setHospitalClinicName(e.target.value)}
                        className="v52-profile-form-input"
                      />
                    </div>
                    <div className="v52-profile-form-field">
                      <label className="v52-profile-input-label">Specialization</label>
                      <input
                        type="text"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="v52-profile-form-input"
                      />
                    </div>
                  </>
                )}

                <div className="v52-profile-form-actions">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="v52-profile-edit-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="v52-profile-edit-save-btn"
                  >
                    {saving ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: SECURITY, WHATSAPP STATUS, CLINICAL SUMMARY */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

          {/* SYSTEM ACCOUNT METRICS */}
          <section className="v52-section-panel v52-bg-insights-panel" aria-labelledby="account-metrics-heading">
            <h3 id="account-metrics-heading" className="v52-panel-heading" style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
              🛡️ System Account Metrics
            </h3>
            <div className="v52-profile-account-metrics-table">
              <div className="v52-profile-metric-row">
                <span className="v52-profile-metric-key">Username:</span>
                <strong className="v52-profile-metric-val">{profile?.username}</strong>
              </div>
              <div className="v52-profile-metric-row">
                <span className="v52-profile-metric-key">Workspace Role:</span>
                <strong className="v52-profile-metric-val role-tag">{user.role}</strong>
              </div>
              {profile?.patientId && (
                <div className="v52-profile-metric-row">
                  <span className="v52-profile-metric-key">Patient ID:</span>
                  <strong className="v52-profile-metric-val id-text">{profile.patientId}</strong>
                </div>
              )}
            </div>
          </section>

          {/* INTEGRATED WHATSAPP CARD */}
          <section className="v52-section-panel v52-bg-today-panel" aria-labelledby="whatsapp-sync-heading">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span className="v52-whatsapp-status-badge-circle">💬</span>
              <h3 id="whatsapp-sync-heading" className="v52-panel-heading" style={{ margin: 0, fontSize: "18px" }}>
                WhatsApp Connection Sync
              </h3>
            </div>
            <p className="v52-profile-explanatory-text">
              Your conversational pipeline is synchronized. Any updates, physiological records, or voice notes uploaded from your linked number will map directly to this clinical timeline.
            </p>
            <div className="v52-profile-linked-phone-row">
              <span className="label">Linked Phone</span>
              <strong className="value">
                {profile?.mobileNumber ? `+${profile.mobileNumber.replace(/\D/g, "")}` : "Not configured"}
              </strong>
            </div>
          </section>

          {/* ANALYTICAL PREVIEW PANEL */}
          <section className="v52-section-panel v52-bg-labs-panel" aria-labelledby="analytical-preview-heading">
            <h3 id="analytical-preview-heading" className="v52-panel-heading" style={{ margin: "0 0 12px 0", fontSize: "18px" }}>
              📊 Clinical Integrity Status
            </h3>
            <div className="v52-profile-analytics-preview-grid">
              <div className="v52-profile-preview-card">
                <span className="label">Encryption</span>
                <strong className="val">Active SSL</strong>
              </div>
              <div className="v52-profile-preview-card">
                <span className="label">Extract Bounds</span>
                <strong className="val">Validated</strong>
              </div>
              <div className="v52-profile-preview-card">
                <span className="label">TZ Offset</span>
                <strong className="val">India (+330)</strong>
              </div>
              <div className="v52-profile-preview-card">
                <span className="label">Medical Audits</span>
                <strong className="val" style={{ color: "var(--v52-teal)" }}>Verified</strong>
              </div>
            </div>

            <div className="v52-profile-password-strength-indicator">
              <span className="label">Password Integrity Strength</span>
              <div className="indicator-track-row">
                <div className="track-bg">
                  <div className="track-fill" style={{ width: "85%" }}></div>
                </div>
                <strong className="status-label">STRONG</strong>
              </div>
            </div>
          </section>

        </div>

      </div>

    </div>
  );
};

export default ProfileViewV5_2;
