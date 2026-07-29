import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./Auth.css";

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

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-primary)" }}>
        <h3 style={{ fontWeight: 500, fontSize: "1.1rem" }}>Loading your personal profile...</h3>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--color-border)", paddingBottom: "20px" }}>
        <p className="summary-section__eyebrow" style={{ color: "var(--color-brand-primary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.75rem", margin: 0 }}>
          Secure Portal Workspace
        </p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--color-text-primary)", fontSize: "1.6rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
          User Profile Management
        </h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
          Review and update your personal information and clinical profile contacts.
        </p>
      </div>

      {/* Profile Core Block */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "28px" }} className="profile-grid-layout">

        {/* Left Column: Avatar & Account Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Avatar Placeholder Card */}
          <div style={{
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            textAlign: "center",
            boxShadow: "var(--shadow-sm)"
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: "var(--color-brand-bg-subtle)",
              color: "var(--color-brand-primary)",
              fontSize: "1.8rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
              border: "2px solid var(--color-brand-primary)"
            }}>
              {fullName ? fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
            </div>

            <h3 style={{ margin: "0 0 4px 0", color: "var(--color-text-primary)", fontSize: "1.1rem", fontWeight: 600 }}>
              {fullName || "User Account"}
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "var(--color-brand-primary)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {user.role} Portal
            </p>

            <div style={{
              display: "inline-block",
              background: "var(--color-border-subtle)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              fontSize: "0.78rem",
              color: "var(--color-text-secondary)",
              fontWeight: 500
            }}>
              ID: {profile?.patientId || profile?.username}
            </div>
          </div>

          {/* Quick Stats/Meta */}
          <div style={{
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            boxShadow: "var(--shadow-sm)"
          }}>
            <h4 style={{ margin: "0 0 12px 0", color: "var(--color-text-primary)", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Account Verification
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Status:</span>
                <span style={{ color: "var(--color-brand-primary)", fontWeight: 600 }}>✓ Verified Email</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Username:</span>
                <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontFamily: "monospace" }}>{profile?.username}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          {/* General Information Form */}
          <div style={{
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            boxShadow: "var(--shadow-sm)"
          }}>
            <h3 style={{ margin: "0 0 20px 0", color: "var(--color-text-primary)", fontSize: "1.05rem", fontWeight: 600, borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "10px" }}>
              General Information
            </h3>

            {error && <div className="auth-error" style={{ marginBottom: "16px", padding: "10px", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }} role="alert">{error}</div>}
            {success && <div className="auth-success" style={{ marginBottom: "16px", padding: "10px", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }} role="alert">{success}</div>}

            <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="auth-form-group">
                  <label htmlFor="p-fullName" style={{ display: "block", fontSize: "0.74rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.03em" }}>Full Name</label>
                  <input
                    id="p-fullName"
                    type="text"
                    className="auth-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={saving}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem" }}
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="p-email" style={{ display: "block", fontSize: "0.74rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.03em" }}>Email Address</label>
                  <input
                    id="p-email"
                    type="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={saving}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem" }}
                  />
                </div>
              </div>

              <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="auth-form-group">
                  <label htmlFor="p-mobileNumber" style={{ display: "block", fontSize: "0.74rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.03em" }}>Mobile Number</label>
                  <input
                    id="p-mobileNumber"
                    type="tel"
                    className="auth-input"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    disabled={saving}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem" }}
                  />
                </div>

                {user.role === "patient" ? (
                  <div className="auth-form-group">
                    <label htmlFor="p-dob" style={{ display: "block", fontSize: "0.74rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.03em" }}>Date of Birth</label>
                    <input
                      id="p-dob"
                      type="date"
                      className="auth-input"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                      disabled={saving}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem" }}
                    />
                  </div>
                ) : (
                  <div className="auth-form-group">
                    <label htmlFor="p-yearsExp" style={{ display: "block", fontSize: "0.74rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.03em" }}>Years of Experience</label>
                    <input
                      id="p-yearsExp"
                      type="text"
                      className="auth-input"
                      placeholder="e.g. 10 years"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      disabled={saving}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem" }}
                    />
                  </div>
                )}
              </div>

              {user.role === "patient" ? (
                <>
                  <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="auth-form-group">
                      <label htmlFor="p-gender" style={{ display: "block", fontSize: "0.74rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.03em" }}>Gender</label>
                      <select
                        id="p-gender"
                        className="auth-select"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        required
                        disabled={saving}
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", background: "transparent" }}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="auth-form-group">
                      <label htmlFor="p-emergency" style={{ display: "block", fontSize: "0.74rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.03em" }}>Emergency Contact</label>
                      <input
                        id="p-emergency"
                        type="text"
                        className="auth-input"
                        placeholder="e.g. Jane Doe (+155512345)"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        disabled={saving}
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem" }}
                      />
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="p-address" style={{ display: "block", fontSize: "0.74rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.03em" }}>Home Address</label>
                    <input
                      id="p-address"
                      type="text"
                      className="auth-input"
                      placeholder="Street, City, State, ZIP"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={saving}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem" }}
                    />
                  </div>
                </>
              ) : (
                <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="auth-form-group">
                    <label htmlFor="p-hospital" style={{ display: "block", fontSize: "0.74rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.03em" }}>Hospital / Clinic Name</label>
                    <input
                      id="p-hospital"
                      type="text"
                      className="auth-input"
                      value={hospitalClinicName}
                      onChange={(e) => setHospitalClinicName(e.target.value)}
                      required
                      disabled={saving}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem" }}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="p-specialization" style={{ display: "block", fontSize: "0.74rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.03em" }}>Specialization</label>
                    <input
                      id="p-specialization"
                      type="text"
                      className="auth-input"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      required
                      disabled={saving}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem" }}
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="auth-submit-btn" style={{ padding: "12px", borderRadius: "var(--radius-md)", background: "var(--color-brand-primary)", color: "#ffffff", fontWeight: 600, fontSize: "0.88rem", border: "none", cursor: "pointer", transition: "all 0.15s ease", marginTop: "10px" }} disabled={saving}>
                {saving ? "Saving Changes..." : "Save Profile Details"}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProfileView;
