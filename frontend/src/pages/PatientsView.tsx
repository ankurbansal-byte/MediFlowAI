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
}

const PatientsView: React.FC<PatientsViewProps> = ({ user }) => {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
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
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Date Registered</th>
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

export default PatientsView;
