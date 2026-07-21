import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./Auth.css";

interface PatientsViewProps {
  user: User;
}

interface PatientData {
  patientId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  dob: string;
  gender: string;
  hospitalId: string;
  createdAt: string;
  status?: string;
}

interface PatientDetail {
  patientId: string;
  username: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  dob: string;
  gender: string;
  hospitalId: string;
  status: string;
  createdAt: string;
}

interface SummaryRecord {
  value: string | number;
  unit: string;
  recordedAt: string;
  source: string;
  confidence: number;
}

interface HealthSummaryData {
  blood_sugar?: SummaryRecord;
  blood_pressure?: SummaryRecord;
  weight?: SummaryRecord;
  heart_rate?: SummaryRecord;
  body_temperature?: SummaryRecord;
}

interface TimelineRecord {
  parameter: string;
  value: string | number;
  unit: string;
  recordedAt: string;
  source: string;
  confidence: number;
}

const PatientsView: React.FC<PatientsViewProps> = ({ user }) => {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Directory enrollment form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");

  // Created patient modal/alert details
  const [enrolledPatient, setEnrolledPatient] = useState<{
    patientId: string;
    fullName: string;
    email: string;
    tempPassword: string;
  } | null>(null);

  // Dedicated Patient Profile states
  const [selectedPatientIdForProfile, setSelectedPatientIdForProfile] = useState<string | null>(null);
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [hospitalNameForProfile, setHospitalNameForProfile] = useState("");
  const [summaryData, setSummaryData] = useState<HealthSummaryData | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineRecord[] | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "history" | "visits" | "prescriptions" | "reports" | "vitals">("overview");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Profile Edit states
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobileNumber, setEditMobileNumber] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editStatus, setEditStatus] = useState("active");

  const fetchPatients = async (query = "") => {
    try {
      const endpoint = query ? `/patient/admin/search?q=${encodeURIComponent(query)}` : "/patient/admin/list";
      const response = await api.get(endpoint);
      if (response.data.success) {
        setPatients(response.data.patients || []);
      } else {
        setError(response.data.message || "Failed to retrieve patients.");
      }
    } catch (err) {
      console.error("Fetch patients error:", err);
      setError("Failed to fetch patients list from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadPatients = async () => {
      try {
        const response = await api.get("/patient/admin/list");
        if (active && response.data.success) {
          setPatients(response.data.patients || []);
        }
      } catch (err) {
        console.error("Fetch patients error:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadPatients();
    return () => {
      active = false;
    };
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchPatients(searchQuery);
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    setLoading(true);
    fetchPatients("");
  };

  const handleEnrollPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setEnrolledPatient(null);
    setSaving(true);

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      mobileNumber: mobileNumber.trim(),
      dob,
      gender,
    };

    try {
      const response = await api.post("/patient/admin/create", payload);
      if (response.data.success) {
        setSuccess("Patient enrolled successfully! Temporary login credentials generated below.");
        setEnrolledPatient({
          patientId: response.data.patient.patientId,
          fullName: response.data.patient.fullName,
          email: response.data.patient.email,
          tempPassword: response.data.temporaryPassword,
        });

        // Clear form
        setFullName("");
        setEmail("");
        setMobileNumber("");
        setDob("");
        setGender("");

        // Refetch list
        fetchPatients(searchQuery);
      } else {
        setError(response.data.message || "Enrolling patient failed.");
      }
    } catch (err) {
      console.error("Enroll patient error:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Failed to enroll new patient.");
    } finally {
      setSaving(false);
    }
  };

  const handleViewPatient = async (pId: string) => {
    setSelectedPatientIdForProfile(pId);
    setIsDetailLoading(true);
    setIsEditingProfile(false);
    setError("");
    setSuccess("");
    setActiveSubTab("overview");
    try {
      // 1. Fetch details
      const detailRes = await api.get(`/patient/admin/detail/${pId}`);
      if (detailRes.data.success) {
        const pd = detailRes.data.patient;
        setPatientDetail(pd);
        setHospitalNameForProfile(detailRes.data.hospitalName || "MediFlow Hospital");

        // Populate edit states
        setEditFullName(pd.fullName || "");
        setEditEmail(pd.email || "");
        setEditMobileNumber(pd.mobileNumber || "");
        setEditDob(pd.dob || "");
        setEditGender(pd.gender || "");
        setEditStatus(pd.status || "active");
      } else {
        setError(detailRes.data.message || "Failed to load patient profile details.");
      }

      // 2. Fetch summary (vitals)
      const summaryRes = await api.get(`/patient/summary/${pId}`);
      if (summaryRes.data.success) {
        setSummaryData(summaryRes.data.summary);
      }

      // 3. Fetch timeline
      const timelineRes = await api.get(`/patient/timeline/${pId}`);
      if (timelineRes.data.success) {
        setTimelineData(timelineRes.data.records);
      }
    } catch (err) {
      console.error("Error loading patient detail:", err);
      setError("Failed to fetch full patient profile records.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleUpdatePatientDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const response = await api.put(`/patient/admin/update/${selectedPatientIdForProfile}`, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        mobileNumber: editMobileNumber.trim(),
        dob: editDob,
        gender: editGender,
        status: editStatus,
      });

      if (response.data.success) {
        setSuccess("Patient profile updated successfully!");
        if (patientDetail) {
          setPatientDetail({
            patientId: patientDetail.patientId,
            username: patientDetail.username,
            hospitalId: patientDetail.hospitalId,
            createdAt: patientDetail.createdAt,
            fullName: editFullName.trim(),
            email: editEmail.trim(),
            mobileNumber: editMobileNumber.trim(),
            dob: editDob,
            gender: editGender,
            status: editStatus,
          });
        }
        setIsEditingProfile(false);
        // Refresh patient directory list
        fetchPatients(searchQuery);
      } else {
        setError(response.data.message || "Failed to update patient profile.");
      }
    } catch (err) {
      console.error("Error updating patient profile:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Failed to save patient profile updates.");
    } finally {
      setSaving(false);
    }
  };

  const renderPatientsDirectory = () => {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
        {/* Page Header */}
        <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px" }}>
          <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
            Hospital Administration Module
          </p>
          <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
            Patient Management & Enrollment
          </h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
            Search, monitor, and register new patients in your hospital directory.
          </p>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: "20px" }} role="alert">{error}</div>}
        {success && <div className="auth-success" style={{ marginBottom: "20px" }} role="alert">{success}</div>}

        {/* Temporary Credentials Success Banner */}
        {enrolledPatient && (
          <div style={{
            background: "#f0fdf4",
            border: "2px solid #22c55e",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "32px",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.15)"
          }}>
            <h3 style={{ color: "#166534", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "8px", fontWeight: 800 }}>
              🎉 Patient Enrollment Completed!
            </h3>
            <p style={{ color: "#1b4332", margin: "0 0 16px 0", fontSize: "0.92rem", lineHeight: "1.5" }}>
              The patient account has been created successfully. <strong>Please copy these temporary credentials and provide them to the patient.</strong> They will be forced to choose a new password on their first login.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              background: "#ffffff",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #bbf7d0"
            }}>
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Patient Name</span>
                <span style={{ fontSize: "1rem", color: "#14532d", fontWeight: 700 }}>{enrolledPatient.fullName}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Patient ID (Login Username)</span>
                <span style={{ fontSize: "1rem", color: "#14532d", fontWeight: 700, fontFamily: "monospace" }}>{enrolledPatient.patientId}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Registered Email</span>
                <span style={{ fontSize: "1rem", color: "#14532d", fontWeight: 700 }}>{enrolledPatient.email}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Temporary Password</span>
                <span style={{ fontSize: "1rem", color: "#b91c1c", fontWeight: 800, fontFamily: "monospace" }}>{enrolledPatient.tempPassword}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnrolledPatient(null)}
              style={{
                marginTop: "16px",
                background: "#22c55e",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Acknowledge & Close
            </button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr", gap: "32px" }} className="profile-grid-layout">

          {/* Left Section: Search and Patient List Table */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Search bar card */}
            <div style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--line, #e4e7eb)",
              borderRadius: "14px",
              padding: "20px",
              boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
            }}>
              <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "12px", width: "100%" }}>
                <input
                  type="text"
                  placeholder="Search patient by ID, Full Name, or Email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.95rem",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: "#0080ff",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0 24px",
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Search
                </button>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleSearchClear}
                    style={{
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "0 16px",
                      fontSize: "0.92rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>

            {/* List Card */}
            <div style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--line, #e4e7eb)",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)",
              overflowX: "auto"
            }}>
              <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.2rem", fontWeight: 800 }}>
                Hospital Patient Directory ({patients.length})
              </h3>

              {loading ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
                  Loading enrolled patients directory...
                </div>
              ) : patients.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
                  No patients found. Match your search query or enroll a new patient.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Patient ID</th>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Full Name</th>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Contact Details</th>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Birth & Gender</th>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Registered</th>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Status</th>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => (
                      <tr key={p.patientId} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }} className="table-row-hover">
                        <td style={{ padding: "14px 8px", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{p.patientId}</td>
                        <td style={{ padding: "14px 8px", fontWeight: 750, color: "var(--navy, #0a2540)" }}>{p.fullName}</td>
                        <td style={{ padding: "14px 8px" }}>
                          <div style={{ fontWeight: 600, color: "var(--navy, #0a2540)" }}>{p.email}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--muted, #486581)" }}>{p.mobileNumber}</div>
                        </td>
                        <td style={{ padding: "14px 8px" }}>
                          <div style={{ fontWeight: 600, color: "var(--navy, #0a2540)" }}>{p.gender}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--muted, #486581)" }}>DOB: {p.dob}</div>
                        </td>
                        <td style={{ padding: "14px 8px", color: "var(--muted, #486581)", fontSize: "0.8rem", fontWeight: 600 }}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"}
                        </td>
                        <td style={{ padding: "14px 8px" }}>
                          <span style={{
                            display: "inline-block",
                            background: p.status === "inactive" ? "#fee2e2" : "#e2fbf0",
                            color: p.status === "inactive" ? "#ef4444" : "#10b981",
                            borderRadius: "12px",
                            padding: "2px 8px",
                            fontSize: "0.75rem",
                            fontWeight: 750,
                            textTransform: "uppercase"
                          }}>
                            {p.status || "active"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 8px" }}>
                          <button
                            type="button"
                            onClick={() => handleViewPatient(p.patientId)}
                            style={{
                              background: "#0080ff",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 12px",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              whiteSpace: "nowrap"
                            }}
                          >
                            View Patient
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Section: Register New Patient Form */}
          <div>
            <div style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--line, #e4e7eb)",
              borderRadius: "14px",
              padding: "28px",
              boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)",
              position: "sticky",
              top: "20px"
            }}>
              <h3 style={{ margin: "0 0 6px 0", color: "var(--navy, #0a2540)", fontSize: "1.2rem", fontWeight: 800 }}>
                Enroll New Patient
              </h3>
              <p style={{ margin: "0 0 20px 0", color: "var(--muted, #486581)", fontSize: "0.85rem", lineHeight: "1.4" }}>
                Complete the credentials profile to generate a unique Patient ID and safe temporary password.
              </p>

              <form onSubmit={handleEnrollPatient} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="auth-form-group">
                  <label htmlFor="p-name" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Full Name</label>
                  <input
                    id="p-name"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Eleanor Vance"
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
                    placeholder="e.g. eleanor@vance.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="p-mobile" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Mobile Number</label>
                  <input
                    id="p-mobile"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. +14155551234"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

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
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  style={{
                    marginTop: "10px",
                    padding: "14px",
                    borderRadius: "8px",
                    background: "#0080ff",
                    color: "#ffffff",
                    fontWeight: 750,
                    border: "none",
                    cursor: "pointer",
                    width: "100%"
                  }}
                  disabled={saving}
                >
                  {saving ? "Enrolling Patient Account..." : "Create Patient & Generate Password"}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderPatientProfile = () => {
    if (isDetailLoading) {
      return (
        <div style={{ padding: "100px 0", textAlign: "center", color: "#0080ff" }}>
          <h3>Loading Patient File Foundation...</h3>
          <p style={{ color: "var(--muted, #486581)", fontSize: "0.9rem" }}>Fetching medical history and demographic isolations...</p>
        </div>
      );
    }

    if (!patientDetail) {
      return (
        <div style={{ padding: "40px", textAlign: "center" }}>
          <p className="auth-error">Error: Patient details not found or permission denied.</p>
          <button
            onClick={() => setSelectedPatientIdForProfile(null)}
            style={{
              marginTop: "16px",
              padding: "10px 20px",
              borderRadius: "8px",
              background: "#0080ff",
              color: "#fff",
              border: "none",
              cursor: "pointer"
            }}
          >
            Back to Directory
          </button>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
        {/* Back navigation and title header */}
        <button
          onClick={() => setSelectedPatientIdForProfile(null)}
          style={{
            background: "none",
            border: "none",
            color: "#0080ff",
            fontWeight: 800,
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "20px",
            padding: "8px 0",
            textTransform: "uppercase",
            letterSpacing: "0.03em"
          }}
        >
          ← Back to Patient Directory
        </button>

        {/* Page Header */}
        <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px" }}>
          <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
            Dedicated Patient File Foundation
          </p>
          <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
            {patientDetail.fullName}
          </h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
            Comprehensive clinical monitoring, medical history logs, and multi-tenant patient demographic access.
          </p>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: "20px" }} role="alert">{error}</div>}
        {success && <div className="auth-success" style={{ marginBottom: "20px" }} role="alert">{success}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: "32px" }} className="profile-grid-layout">

          {/* Left Column: Demographics & Edit form */}
          <div>
            <div style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--line, #e4e7eb)",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "10px" }}>
                <h3 style={{ margin: 0, color: "var(--navy, #0a2540)", fontSize: "1.1rem", fontWeight: 800 }}>
                  Demographics
                </h3>
                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    style={{
                      background: "#f4f8fc",
                      color: "#0080ff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    Edit Demographics
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleUpdatePatientDetails} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="auth-form-group">
                    <label htmlFor="edit-p-name" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Full Name</label>
                    <input
                      id="edit-p-name"
                      type="text"
                      className="auth-input"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="edit-p-email" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Email Address</label>
                    <input
                      id="edit-p-email"
                      type="email"
                      className="auth-input"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="edit-p-mobile" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Mobile Number</label>
                    <input
                      id="edit-p-mobile"
                      type="text"
                      className="auth-input"
                      value={editMobileNumber}
                      onChange={(e) => setEditMobileNumber(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="edit-p-dob" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Date of Birth</label>
                    <input
                      id="edit-p-dob"
                      type="date"
                      className="auth-input"
                      value={editDob}
                      onChange={(e) => setEditDob(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="edit-p-gender" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Gender</label>
                    <select
                      id="edit-p-gender"
                      className="auth-select"
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value)}
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
                    <label htmlFor="edit-p-status" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Account Status</label>
                    <select
                      id="edit-p-status"
                      className="auth-select"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      required
                      disabled={saving}
                      style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #cbd2d9", borderRadius: "8px" }}
                    >
                      <option value="active">Active (Enabled)</option>
                      <option value="inactive">Inactive (Deactivated)</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button
                      type="submit"
                      className="auth-submit-btn"
                      style={{ flex: 1, padding: "10px", borderRadius: "6px", background: "#0080ff", color: "#ffffff", fontWeight: 700, border: "none", cursor: "pointer" }}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Details"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setError("");
                      }}
                      style={{ flex: 1, padding: "10px", borderRadius: "6px", background: "#f1f5f9", color: "#475569", fontWeight: 700, border: "1px solid #cbd5e1", cursor: "pointer" }}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Patient ID</span>
                    <span style={{ fontSize: "1rem", color: "var(--navy, #0a2540)", fontWeight: 750, fontFamily: "monospace" }}>{patientDetail.patientId}</span>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Full Name</span>
                    <span style={{ fontSize: "1rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{patientDetail.fullName}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Date of Birth</span>
                      <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{patientDetail.dob}</span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Gender</span>
                      <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{patientDetail.gender}</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Mobile Number</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{patientDetail.mobileNumber}</span>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Email</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600, wordBreak: "break-all" }}>{patientDetail.email}</span>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Hospital</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{hospitalNameForProfile}</span>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Registration Date</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>
                      {patientDetail.createdAt ? new Date(patientDetail.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Account Status</span>
                    <span style={{
                      display: "inline-block",
                      background: patientDetail.status === "inactive" ? "#fee2e2" : "#e3fcef",
                      border: patientDetail.status === "inactive" ? "1px solid #ef4444" : "1px solid #00a389",
                      borderRadius: "20px",
                      padding: "4px 12px",
                      fontSize: "0.8rem",
                      color: patientDetail.status === "inactive" ? "#991b1b" : "#006653",
                      fontWeight: 750,
                      textTransform: "uppercase"
                    }}>
                      {patientDetail.status || "active"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Tabbed layouts */}
          <div>
            {/* Tab navigation */}
            <div style={{
              display: "flex",
              borderBottom: "2px solid #e2e8f0",
              marginBottom: "24px",
              gap: "20px",
              overflowX: "auto"
            }}>
              {(["overview", "history", "visits", "prescriptions", "reports", "vitals"] as const).map((tab) => {
                const isActive = activeSubTab === tab;
                const label = tab === "history" ? "Medical History" : tab.charAt(0).toUpperCase() + tab.slice(1);
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSubTab(tab)}
                    style={{
                      background: "none",
                      border: "none",
                      borderBottom: isActive ? "3px solid #0080ff" : "3px solid transparent",
                      color: isActive ? "#0080ff" : "var(--muted, #486581)",
                      fontWeight: 750,
                      padding: "10px 0",
                      fontSize: "0.92rem",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s ease",
                      marginBottom: "-2px"
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Tab content screens */}
            <div>
              {activeSubTab === "overview" && (
                <div>
                  <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
                    Overview Summary & Recent Vitals
                  </h3>

                  {/* Vitals summary grids */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "16px",
                    marginBottom: "32px"
                  }}>
                    {/* Blood Sugar */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>🩸</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Blood Sugar</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {summaryData?.blood_sugar?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{summaryData?.blood_sugar?.unit || ""}</span>
                      </strong>
                    </div>

                    {/* Blood Pressure */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>🩺</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Blood Pressure</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {summaryData?.blood_pressure?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{summaryData?.blood_pressure?.unit || ""}</span>
                      </strong>
                    </div>

                    {/* Weight */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>⚖️</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Weight</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {summaryData?.weight?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{summaryData?.weight?.unit || ""}</span>
                      </strong>
                    </div>

                    {/* Heart Rate */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>❤️</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Heart Rate</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {summaryData?.heart_rate?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{summaryData?.heart_rate?.unit || ""}</span>
                      </strong>
                    </div>

                    {/* Temperature */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>🌡️</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Temperature</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {summaryData?.body_temperature?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{summaryData?.body_temperature?.unit || ""}</span>
                      </strong>
                    </div>
                  </div>

                  {/* Activity Timeline logs */}
                  <h4 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1rem", fontWeight: 800 }}>
                    Recent Clinical Log Timeline
                  </h4>

                  {(!timelineData || timelineData.length === 0) ? (
                    <div style={{
                      padding: "48px",
                      textAlign: "center",
                      background: "#ffffff",
                      border: "1px dashed var(--line, #e4e7eb)",
                      borderRadius: "10px",
                      color: "var(--muted, #486581)"
                    }}>
                      No clinical logs recorded for this patient.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {timelineData.map((record, index) => {
                        const date = new Date(record.recordedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        });
                        const cleanParam = record.parameter.toUpperCase().replace("_", " ");
                        return (
                          <div
                            key={index}
                            style={{
                              background: "#ffffff",
                              border: "1px solid var(--line, #e4e7eb)",
                              borderLeft: "4px solid #0080ff",
                              borderRadius: "8px",
                              padding: "16px",
                              boxShadow: "0 4px 12px rgba(10, 37, 64, 0.02)"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "#0080ff", letterSpacing: "0.02em" }}>
                                {cleanParam}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)", fontWeight: 600 }}>
                                {date}
                              </span>
                            </div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--navy, #0a2540)" }}>
                              {record.value} <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #486581)" }}>{record.unit}</span>
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--muted, #486581)", marginTop: "4px", fontStyle: "italic" }}>
                              Source: {record.source} (Confidence: {Math.round(record.confidence * 100)}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeSubTab === "history" && (
                <div style={{
                  padding: "60px 24px",
                  textAlign: "center",
                  background: "#ffffff",
                  border: "1px dashed var(--line, #e4e7eb)",
                  borderRadius: "14px",
                  boxShadow: "0 10px 30px rgba(10, 37, 64, 0.02)"
                }}>
                  <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🏥</div>
                  <h3 style={{ margin: "0 0 8px 0", color: "var(--navy, #0a2540)", fontWeight: 800 }}>Medical History Foundation</h3>
                  <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.92rem", maxWidth: "450px", marginLeft: "auto", marginRight: "auto" }}>
                    No chronic conditions, past surgeries, or family medical history documented for this patient file.
                  </p>
                </div>
              )}

              {activeSubTab === "visits" && (
                <div style={{
                  padding: "60px 24px",
                  textAlign: "center",
                  background: "#ffffff",
                  border: "1px dashed var(--line, #e4e7eb)",
                  borderRadius: "14px",
                  boxShadow: "0 10px 30px rgba(10, 37, 64, 0.02)"
                }}>
                  <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📆</div>
                  <h3 style={{ margin: "0 0 8px 0", color: "var(--navy, #0a2540)", fontWeight: 800 }}>Visits & Appointments</h3>
                  <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.92rem", maxWidth: "450px", marginLeft: "auto", marginRight: "auto" }}>
                    No clinical outpatient visits, consultations, or admissions recorded in this sprint foundation.
                  </p>
                </div>
              )}

              {activeSubTab === "prescriptions" && (
                <div style={{
                  padding: "60px 24px",
                  textAlign: "center",
                  background: "#ffffff",
                  border: "1px dashed var(--line, #e4e7eb)",
                  borderRadius: "14px",
                  boxShadow: "0 10px 30px rgba(10, 37, 64, 0.02)"
                }}>
                  <div style={{ fontSize: "3rem", marginBottom: "16px" }}>💊</div>
                  <h3 style={{ margin: "0 0 8px 0", color: "var(--navy, #0a2540)", fontWeight: 800 }}>Prescriptions Ledger</h3>
                  <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.92rem", maxWidth: "450px", marginLeft: "auto", marginRight: "auto" }}>
                    No pharmaceutical prescriptions or drug lists issued for this patient record.
                  </p>
                </div>
              )}

              {activeSubTab === "reports" && (
                <div style={{
                  padding: "60px 24px",
                  textAlign: "center",
                  background: "#ffffff",
                  border: "1px dashed var(--line, #e4e7eb)",
                  borderRadius: "14px",
                  boxShadow: "0 10px 30px rgba(10, 37, 64, 0.02)"
                }}>
                  <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📋</div>
                  <h3 style={{ margin: "0 0 8px 0", color: "var(--navy, #0a2540)", fontWeight: 800 }}>Diagnostic & Lab Reports</h3>
                  <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.92rem", maxWidth: "450px", marginLeft: "auto", marginRight: "auto" }}>
                    Laboratory uploads, clinical radiology PDF reports, and blood panels are awaiting upload integration.
                  </p>
                </div>
              )}

              {activeSubTab === "vitals" && (
                <div style={{
                  padding: "60px 24px",
                  textAlign: "center",
                  background: "#ffffff",
                  border: "1px dashed var(--line, #e4e7eb)",
                  borderRadius: "14px",
                  boxShadow: "0 10px 30px rgba(10, 37, 64, 0.02)"
                }}>
                  <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📈</div>
                  <h3 style={{ margin: "0 0 8px 0", color: "var(--navy, #0a2540)", fontWeight: 800 }}>Advanced Vitals Charting</h3>
                  <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.92rem", maxWidth: "450px", marginLeft: "auto", marginRight: "auto" }}>
                    Historical diagnostic graphs and multi-variable vitals panels will be rendered in a future workspace release.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  };

  if (selectedPatientIdForProfile) {
    return renderPatientProfile();
  }

  return renderPatientsDirectory();
};

export default PatientsView;
