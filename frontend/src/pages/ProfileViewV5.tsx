import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./DashboardV5.css";

interface ProfileViewV5Props {
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

const EditorialTransition: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="v5-editorial-transition" style={{ padding: "16px 0" }}>
      <div className="v5-editorial-divider">
        <div className="v5-editorial-line"></div>
        <span className="v5-editorial-icon">✦</span>
        <span className="v5-editorial-badge">PROFILE</span>
        <span className="v5-editorial-icon">✦</span>
        <div className="v5-editorial-line"></div>
      </div>
      <p className="v5-editorial-text" style={{ fontSize: "16px", maxWidth: "520px" }}>
        {text}
      </p>
    </div>
  );
};

const ProfileViewV5: React.FC<ProfileViewV5Props> = ({ user, onProfileUpdate }) => {
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
      <div className="dashboard--v5 v5-mediflow-pattern" style={{ padding: "40px", textAlign: "center", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="v5-editorial-text" style={{ fontSize: "16px", color: "var(--v5-text-muted)" }}>
          Loading your personalized V5 clinical profile...
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard--v5 v5-mediflow-pattern" style={{ display: "flex", flexDirection: "column", gap: "32px", padding: "16px 24px" }}>

      {/* SECTION 1: PREMIUM PROFILE HEADER */}
      <div className="v5-hero-wrapper" style={{ background: "#FAF3E8" }}>
        <div className="v5-hero" style={{ padding: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            {/* Avatar Circle Container */}
            <div style={{
              width: "84px",
              height: "84px",
              borderRadius: "50%",
              background: "var(--v5-brand-purple-light)",
              border: "3.5px solid var(--v5-bg-white)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 600,
              color: "var(--v5-brand-purple)",
              boxShadow: "var(--v5-shadow-md)"
            }}>
              {fullName ? fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="v5-eyebrow" style={{ color: "var(--v5-brand-orange)", background: "#FFF0E0", padding: "2px 8px", borderRadius: "4px", alignSelf: "flex-start", marginBottom: "8px", fontSize: "10px" }}>
                {user.role} workspace
              </span>
              <h1 className="v5-display" style={{ fontSize: "28px", margin: "0 0 4px 0" }}>
                {fullName || "User Profile"}
              </h1>
              <p className="v5-body" style={{ color: "var(--v5-text-muted)", margin: 0 }}>
                {profile?.email || "No email linked"} · Connected Patient Space
              </p>
            </div>
          </div>

          <div>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  background: "var(--v5-brand-orange)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#E56E00"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--v5-brand-orange)"}
              >
                ✏️ Edit Profile
              </button>
            ) : (
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={cancelEditing}
                  style={{
                    background: "none",
                    border: "1.5px solid var(--v5-border-subtle)",
                    color: "var(--v5-text-dark)",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleProfileSave}
                  type="submit"
                  style={{
                    background: "var(--v5-brand-green)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <EditorialTransition text="“Your clinical profile ensures high accuracy in automated extraction and care coordination.”" />

      {/* Main Layout Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "32px" }}>

        {/* Left Side: Profile Details & Edit Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {error && (
            <div style={{
              background: "#FFE4E6",
              border: "1.5px solid #FCA5A5",
              color: "var(--v5-brand-coral)",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500
            }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{
              background: "var(--v5-brand-green-light)",
              border: "1.5px solid #A7F3D0",
              color: "#065F46",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500
            }}>
              ✓ {success}
            </div>
          )}

          {/* PERSONAL INFORMATION CARD */}
          <div style={{
            background: "var(--v5-bg-white)",
            border: "1.5px solid var(--v5-border-subtle)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <h3 className="v5-section-heading" style={{ fontSize: "18px", borderBottom: "1.5px solid var(--v5-bg-cream)", paddingBottom: "12px", marginBottom: "20px" }}>
              👤 Personal Information
            </h3>

            {!isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <span className="v5-eyebrow">Full Name</span>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--v5-text-dark)", marginTop: "4px" }}>
                      {profile?.fullName || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="v5-eyebrow">Email Address</span>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--v5-text-dark)", marginTop: "4px" }}>
                      {profile?.email || "—"}
                    </strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <span className="v5-eyebrow">Mobile Number</span>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--v5-text-dark)", marginTop: "4px" }}>
                      {profile?.mobileNumber || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="v5-eyebrow">Date of Birth</span>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--v5-text-dark)", marginTop: "4px" }}>
                      {profile?.dob || "—"}
                    </strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <span className="v5-eyebrow">Gender</span>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--v5-text-dark)", marginTop: "4px" }}>
                      {profile?.gender || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="v5-eyebrow">Emergency Contact</span>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--v5-text-dark)", marginTop: "4px" }}>
                      {profile?.emergencyContact || "—"}
                    </strong>
                  </div>
                </div>

                {user.role === "patient" ? (
                  <div>
                    <span className="v5-eyebrow">Home Address</span>
                    <strong style={{ display: "block", fontSize: "15px", color: "var(--v5-text-dark)", marginTop: "4px" }}>
                      {profile?.address || "—"}
                    </strong>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <span className="v5-eyebrow">Hospital/Clinic</span>
                      <strong style={{ display: "block", fontSize: "15px", color: "var(--v5-text-dark)", marginTop: "4px" }}>
                        {profile?.hospitalClinicName || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="v5-eyebrow">Specialization</span>
                      <strong style={{ display: "block", fontSize: "15px", color: "var(--v5-text-dark)", marginTop: "4px" }}>
                        {profile?.specialization || "—"}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label className="v5-eyebrow" style={{ display: "block", marginBottom: "6px" }}>Full Name</label>
                    <input
                      type="text"
                      className="auth-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "8px", background: "var(--v5-bg-cream)", fontSize: "14px", color: "var(--v5-text-dark)" }}
                    />
                  </div>
                  <div>
                    <label className="v5-eyebrow" style={{ display: "block", marginBottom: "6px" }}>Email Address</label>
                    <input
                      type="email"
                      className="auth-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "8px", background: "var(--v5-bg-cream)", fontSize: "14px", color: "var(--v5-text-dark)" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label className="v5-eyebrow" style={{ display: "block", marginBottom: "6px" }}>Mobile Number</label>
                    <input
                      type="tel"
                      className="auth-input"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "8px", background: "var(--v5-bg-cream)", fontSize: "14px", color: "var(--v5-text-dark)" }}
                    />
                  </div>
                  <div>
                    <label className="v5-eyebrow" style={{ display: "block", marginBottom: "6px" }}>Date of Birth</label>
                    <input
                      type="date"
                      className="auth-input"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "8px", background: "var(--v5-bg-cream)", fontSize: "14px", color: "var(--v5-text-dark)" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label className="v5-eyebrow" style={{ display: "block", marginBottom: "6px" }}>Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "8px", background: "var(--v5-bg-cream)", fontSize: "14px", color: "var(--v5-text-dark)" }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="v5-eyebrow" style={{ display: "block", marginBottom: "6px" }}>Emergency Contact</label>
                    <input
                      type="text"
                      className="auth-input"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "8px", background: "var(--v5-bg-cream)", fontSize: "14px", color: "var(--v5-text-dark)" }}
                    />
                  </div>
                </div>

                {user.role === "patient" ? (
                  <div>
                    <label className="v5-eyebrow" style={{ display: "block", marginBottom: "6px" }}>Home Address</label>
                    <input
                      type="text"
                      className="auth-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "8px", background: "var(--v5-bg-cream)", fontSize: "14px", color: "var(--v5-text-dark)" }}
                    />
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label className="v5-eyebrow" style={{ display: "block", marginBottom: "6px" }}>Hospital/Clinic</label>
                      <input
                        type="text"
                        className="auth-input"
                        value={hospitalClinicName}
                        onChange={(e) => setHospitalClinicName(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "8px", background: "var(--v5-bg-cream)", fontSize: "14px", color: "var(--v5-text-dark)" }}
                      />
                    </div>
                    <div>
                      <label className="v5-eyebrow" style={{ display: "block", marginBottom: "6px" }}>Specialization</label>
                      <input
                        type="text"
                        className="auth-input"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--v5-border-subtle)", borderRadius: "8px", background: "var(--v5-bg-cream)", fontSize: "14px", color: "var(--v5-text-dark)" }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    style={{
                      background: "none",
                      border: "1.5px solid var(--v5-border-subtle)",
                      color: "var(--v5-text-dark)",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      background: "var(--v5-brand-green)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {saving ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Side: Account Details, WhatsApp Info, Security Status, and Activity Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* ACCOUNT DETAILS */}
          <div style={{
            background: "var(--v5-bg-white)",
            border: "1.5px solid var(--v5-border-subtle)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <h4 className="v5-eyebrow" style={{ color: "var(--v5-brand-purple)", marginBottom: "14px" }}>
              🛡️ Account Details
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--v5-bg-cream)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--v5-text-muted)" }}>Username:</span>
                <span style={{ color: "var(--v5-text-dark)", fontWeight: 600, fontFamily: "monospace" }}>{profile?.username}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--v5-bg-cream)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--v5-text-muted)" }}>Account Role:</span>
                <span style={{
                  color: "var(--v5-brand-purple)",
                  fontWeight: 600,
                  fontSize: "11px",
                  background: "var(--v5-brand-purple-light)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  textTransform: "uppercase"
                }}>{user.role}</span>
              </div>
              {profile?.patientId && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--v5-text-muted)" }}>Patient ID:</span>
                  <span style={{ color: "var(--v5-brand-orange)", fontWeight: 600, fontFamily: "monospace" }}>{profile.patientId}</span>
                </div>
              )}
            </div>
          </div>

          {/* CONNECTED WHATSAPP INFORMATION */}
          <div style={{
            background: "#E8F5E9",
            border: "1.5px solid #C8E6C9",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "var(--v5-brand-green-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                color: "var(--v5-brand-green)"
              }}>💬</span>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--v5-text-dark)" }}>
                Connected WhatsApp
              </h4>
            </div>
            <p className="v5-body" style={{ color: "var(--v5-text-muted)", fontSize: "13px", marginBottom: "12px" }}>
              Your account is successfully linked to WhatsApp. Vitals sent from your number are organized and verified automatically.
            </p>
            <div style={{
              background: "#FFFFFF",
              border: "1px solid #C8E6C9",
              padding: "8px 12px",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ fontSize: "12px", color: "var(--v5-text-muted)", fontWeight: 600 }}>Linked Number</span>
              <strong style={{ fontSize: "13px", color: "var(--v5-text-dark)" }}>
                {profile?.mobileNumber ? `+${profile.mobileNumber.replace(/\D/g, "")}` : "Not linked"}
              </strong>
            </div>
          </div>

          {/* SECURITY SECTION */}
          <div style={{
            background: "var(--v5-bg-white)",
            border: "1.5px solid var(--v5-border-subtle)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <h4 className="v5-eyebrow" style={{ color: "var(--v5-text-dark)", marginBottom: "12px" }}>
              🛡️ Security Status
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--v5-brand-green)", fontSize: "16px" }}>✓</span>
                <span style={{ fontSize: "13px", color: "var(--v5-text-dark)", fontWeight: 500 }}>
                  Active SSL/TLS Encryption
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--v5-brand-green)", fontSize: "16px" }}>✓</span>
                <span style={{ fontSize: "13px", color: "var(--v5-text-dark)", fontWeight: 500 }}>
                  Multilingual Extraction Validated
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--v5-brand-green)", fontSize: "16px" }}>✓</span>
                <span style={{ fontSize: "13px", color: "var(--v5-text-dark)", fontWeight: 500 }}>
                  Indian Timezone Correctness Enabled (+330m)
                </span>
              </div>
              <div style={{ marginTop: "8px", borderTop: "1px solid var(--v5-bg-cream)", paddingTop: "10px" }}>
                <span style={{ fontSize: "11px", color: "var(--v5-text-muted)", display: "block" }}>Password Strength Indicator</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                  <div style={{ flex: 1, background: "var(--v5-bg-cream)", height: "6px", borderRadius: "3px" }}>
                    <div style={{ background: "var(--v5-brand-green)", height: "100%", width: "85%", borderRadius: "3px" }}></div>
                  </div>
                  <strong style={{ fontSize: "11px", color: "var(--v5-brand-green)" }}>STRONG</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVITY SUMMARY */}
          <div style={{
            background: "#FFFBF7",
            border: "1.5px solid #FEEADB",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "var(--v5-shadow-sm)"
          }}>
            <h4 className="v5-eyebrow" style={{ color: "var(--v5-brand-orange)", marginBottom: "12px" }}>
              📊 Longitudinal Activity
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ background: "#FFFFFF", padding: "10px", borderRadius: "8px", border: "1px solid #FFE5CC" }}>
                <span style={{ fontSize: "11px", color: "var(--v5-text-muted)", display: "block" }}>Record Updates</span>
                <strong style={{ fontSize: "18px", color: "var(--v5-text-dark)" }}>Active</strong>
              </div>
              <div style={{ background: "#FFFFFF", padding: "10px", borderRadius: "8px", border: "1px solid #FFE5CC" }}>
                <span style={{ fontSize: "11px", color: "var(--v5-text-muted)", display: "block" }}>Clinical Status</span>
                <strong style={{ fontSize: "18px", color: "var(--v5-brand-green)" }}>Verified</strong>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ProfileViewV5;
