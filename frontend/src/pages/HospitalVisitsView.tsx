import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./Auth.css";

interface HospitalVisitsViewProps {
  user: User;
}

interface EncounterData {
  encounterId: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  visitDate: string;
  visitType: string;
  chiefComplaint: string;
  symptoms: string;
  provisionalDiagnosis: string;
  doctorNotes: string;
  followUpDate?: string;
  status: "draft" | "completed";
  createdBy: string;
  createdAt: string;
}

interface DropdownItem {
  id: string;
  name: string;
  detail?: string;
}

const HospitalVisitsView: React.FC<HospitalVisitsViewProps> = ({ user }) => {
  const [encounters, setEncounters] = useState<EncounterData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Directory lists for selecting Patients and Doctors
  const [availablePatients, setAvailablePatients] = useState<DropdownItem[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<DropdownItem[]>([]);

  // Registration Form States
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [visitType, setVisitType] = useState("OPD Consultation");
  const [visitDate, setVisitDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [chiefComplaint, setChiefComplaint] = useState("");

  // Success Banner details for recently registered visit
  const [registeredVisit, setRegisteredVisit] = useState<EncounterData | null>(null);

  // Modal View state for a single encounter
  const [viewingEncounter, setViewingEncounter] = useState<EncounterData | null>(null);

  const fetchEncounters = async () => {
    try {
      const response = await api.get("/encounter/hospital");
      if (response.data.success) {
        setEncounters(response.data.encounters || []);
      }
    } catch (err) {
      console.error("Fetch encounters error:", err);
    }
  };

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const response = await api.get("/encounter/hospital");
        if (response.data.success) {
          setEncounters(response.data.encounters || []);
        } else {
          setError(response.data.message || "Failed to retrieve hospital visits.");
        }

        // Fetch active patients
        const patRes = await api.get("/patient/admin/list");
        if (patRes.data.success) {
          const list = (patRes.data.patients || [])
            .filter((p: { status?: string; patientId: string; fullName: string }) => p.status !== "inactive")
            .map((p: { patientId: string; fullName: string }) => ({
              id: p.patientId,
              name: p.fullName,
              detail: p.patientId,
            }));
          setAvailablePatients(list);
        }

        // Fetch active doctors
        const docRes = await api.get("/doctor/admin/list");
        if (docRes.data.success) {
          const list = (docRes.data.doctors || [])
            .filter((d: { status?: string; doctorId: string; fullName: string; department: string }) => d.status !== "inactive")
            .map((d: { doctorId: string; fullName: string; department: string }) => ({
              id: d.doctorId,
              name: d.fullName,
              detail: `${d.department} (${d.doctorId})`,
            }));
          setAvailableDoctors(list);
        }
      } catch (err) {
        console.error("Fetch metadata error:", err);
        setError("Failed to fetch visits directory from the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [user]);

  const handleRegisterVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setRegisteredVisit(null);

    if (!selectedPatientId || !selectedDoctorId || !visitType || !visitDate) {
      setError("Please fill out all required fields.");
      return;
    }

    setSaving(true);
    const payload = {
      patientId: selectedPatientId,
      doctorId: selectedDoctorId,
      visitDate,
      visitType,
      chiefComplaint: chiefComplaint.trim(),
    };

    try {
      const response = await api.post("/encounter/create", payload);
      if (response.data.success) {
        setSuccess("OPD Visit Registered Successfully!");
        setRegisteredVisit(response.data.encounter);

        // Clear Form (Keep default Date)
        setSelectedPatientId("");
        setSelectedDoctorId("");
        setVisitType("OPD Consultation");
        setChiefComplaint("");

        // Refetch Directory
        await fetchEncounters();
      } else {
        setError(response.data.message || "Registration failed.");
      }
    } catch (err) {
      console.error("Register encounter error:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Failed to register OPD consultation.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDetail = async (encId: string) => {
    setError("");
    try {
      const response = await api.get(`/encounter/detail/${encId}`);
      if (response.data.success) {
        const fullEnc = {
          ...response.data.encounter,
          patientName: response.data.patientName,
          doctorName: response.data.doctorName,
        };
        setViewingEncounter(fullEnc);
      } else {
        setError(response.data.message || "Failed to fetch details.");
      }
    } catch (err) {
      console.error("Error loading encounter:", err);
      setError("Could not retrieve encounter details.");
    }
  };

  const handleSearchClear = () => {
    setSearchQuery("");
  };

  // Filtering calculations
  const todayStr = new Date().toISOString().split("T")[0];

  const filteredEncounters = encounters.filter((enc) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      enc.encounterId.toLowerCase().includes(q) ||
      enc.patientId.toLowerCase().includes(q) ||
      enc.patientName.toLowerCase().includes(q) ||
      enc.doctorId.toLowerCase().includes(q) ||
      enc.doctorName.toLowerCase().includes(q) ||
      enc.visitType.toLowerCase().includes(q) ||
      enc.status.toLowerCase().includes(q)
    );
  });

  const todayVisits = encounters.filter((enc) => {
    if (!enc.visitDate) return false;
    const encDateStr = new Date(enc.visitDate).toISOString().split("T")[0];
    return encDateStr === todayStr;
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px" }}>
        <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
          Hospital Administration Module
        </p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
          OPD Visit & Clinical Encounters
        </h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
          Register and monitor patient consultations, schedule new follow-ups, and review hospital OPD visits.
        </p>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: "20px" }} role="alert">{error}</div>}
      {success && <div className="auth-success" style={{ marginBottom: "20px" }} role="alert">{success}</div>}

      {/* Success details block for recent visit */}
      {registeredVisit && (
        <div style={{
          background: "#f0fdf4",
          border: "2px solid #22c55e",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "32px",
          boxShadow: "0 4px 12px rgba(34, 197, 94, 0.15)"
        }}>
          <h3 style={{ color: "#166534", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "8px", fontWeight: 800 }}>
            🎉 OPD Visit Registered Successfully!
          </h3>
          <p style={{ color: "#1b4332", margin: "0 0 16px 0", fontSize: "0.92rem", lineHeight: "1.5" }}>
            The Clinical Encounter foundation has been established. It is now instantly visible to the assigned doctor.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            background: "#ffffff",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #bbf7d0"
          }}>
            <div>
              <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Visit ID / Encounter ID</span>
              <span style={{ fontSize: "1rem", color: "#14532d", fontWeight: 700, fontFamily: "monospace" }}>{registeredVisit.encounterId}</span>
            </div>
            <div>
              <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Patient ID</span>
              <span style={{ fontSize: "1rem", color: "#14532d", fontWeight: 700 }}>{registeredVisit.patientId}</span>
            </div>
            <div>
              <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Doctor ID</span>
              <span style={{ fontSize: "1rem", color: "#14532d", fontWeight: 700 }}>{registeredVisit.doctorId}</span>
            </div>
            <div>
              <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Scheduled Date</span>
              <span style={{ fontSize: "1rem", color: "#14532d", fontWeight: 700 }}>
                {new Date(registeredVisit.visitDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div>
              <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Consultation Type</span>
              <span style={{ fontSize: "1rem", color: "#14532d", fontWeight: 700 }}>{registeredVisit.visitType}</span>
            </div>
            <div>
              <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Initial Status</span>
              <span style={{
                display: "inline-block",
                background: "#fef3c7",
                color: "#d97706",
                borderRadius: "10px",
                padding: "2px 8px",
                fontSize: "0.75rem",
                fontWeight: 750,
                textTransform: "uppercase",
                marginTop: "4px"
              }}>{registeredVisit.status}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRegisteredVisit(null)}
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

      {/* Main Grid split */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr", gap: "32px" }} className="profile-grid-layout">

        {/* Left column: Visits Directory and Listings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Today's Visits summary panel */}
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
          }}>
            <h3 style={{ margin: "0 0 12px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
              📅 Today's Visits ({todayVisits.length})
            </h3>
            {todayVisits.length === 0 ? (
              <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.9rem" }}>
                No outpatient consultation visits registered for today yet.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                {todayVisits.map((v) => (
                  <div
                    key={v.encounterId}
                    onClick={() => handleOpenDetail(v.encounterId)}
                    style={{
                      border: "1px solid var(--line, #e4e7eb)",
                      borderRadius: "8px",
                      padding: "12px",
                      background: "#f8fafc",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                    className="table-row-hover"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{v.encounterId}</span>
                      <span style={{
                        fontSize: "0.68rem",
                        fontWeight: 750,
                        textTransform: "uppercase",
                        color: v.status === "completed" ? "#10b981" : "#d97706"
                      }}>{v.status}</span>
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--navy, #0a2540)" }}>{v.patientName}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{v.doctorName.startsWith("Dr.") ? v.doctorName : `Dr. ${v.doctorName}`}</div>
                    <div style={{ fontSize: "0.72rem", color: "#627d98", marginTop: "4px", fontStyle: "italic" }}>{v.visitType}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search Visit bar */}
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "20px",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
          }}>
            <div style={{ display: "flex", gap: "12px", width: "100%" }}>
              <input
                type="text"
                placeholder="Search visits by ID, patient, doctor, status..."
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
            </div>
          </div>

          {/* Main directory list card */}
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)",
            overflowX: "auto"
          }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.2rem", fontWeight: 800 }}>
              OPD Visit Directory ({filteredEncounters.length})
            </h3>

            {loading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
                Loading visit directory records...
              </div>
            ) : filteredEncounters.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
                No clinical encounters found matching your criteria.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Visit ID</th>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Patient</th>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Doctor</th>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Visit Date</th>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Type</th>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Status</th>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEncounters.map((enc) => (
                    <tr key={enc.encounterId} style={{ borderBottom: "1px solid #f1f5f9" }} className="table-row-hover">
                      <td style={{ padding: "14px 8px", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{enc.encounterId}</td>
                      <td style={{ padding: "14px 8px" }}>
                        <div style={{ fontWeight: 750, color: "var(--navy, #0a2540)" }}>{enc.patientName}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted, #486581)" }}>ID: {enc.patientId}</div>
                      </td>
                      <td style={{ padding: "14px 8px" }}>
                        <div style={{ fontWeight: 700, color: "var(--navy, #0a2540)" }}>{enc.doctorName.startsWith("Dr.") ? enc.doctorName : `Dr. ${enc.doctorName}`}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted, #486581)" }}>ID: {enc.doctorId}</div>
                      </td>
                      <td style={{ padding: "14px 8px", fontWeight: 600, color: "var(--navy, #0a2540)" }}>
                        {new Date(enc.visitDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: "14px 8px", color: "var(--muted, #486581)", fontWeight: 600 }}>{enc.visitType}</td>
                      <td style={{ padding: "14px 8px" }}>
                        <span style={{
                          display: "inline-block",
                          background: enc.status === "completed" ? "#e2fbf0" : "#fffbeb",
                          color: enc.status === "completed" ? "#10b981" : "#d97706",
                          border: enc.status === "completed" ? "1px solid #a7f3d0" : "1px solid #fde68a",
                          borderRadius: "12px",
                          padding: "2px 8px",
                          fontSize: "0.75rem",
                          fontWeight: 750,
                          textTransform: "uppercase"
                        }}>
                          {enc.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 8px" }}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(enc.encounterId)}
                          style={{
                            background: "#0080ff",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column: Register New OPD Visit form */}
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
              Register New Visit
            </h3>
            <p style={{ margin: "0 0 20px 0", color: "var(--muted, #486581)", fontSize: "0.85rem", lineHeight: "1.4" }}>
              Enroll a patient into a clinical outpatient visit with an active practitioner of your hospital.
            </p>

            <form onSubmit={handleRegisterVisit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="auth-form-group">
                <label htmlFor="reg-patient" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Select Patient *</label>
                <select
                  id="reg-patient"
                  className="auth-select"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                  disabled={saving}
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #cbd2d9", borderRadius: "8px" }}
                >
                  <option value="">-- Select Patient --</option>
                  {availablePatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.detail})
                    </option>
                  ))}
                </select>
              </div>

              <div className="auth-form-group">
                <label htmlFor="reg-doctor" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Select Doctor *</label>
                <select
                  id="reg-doctor"
                  className="auth-select"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  required
                  disabled={saving}
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #cbd2d9", borderRadius: "8px" }}
                >
                  <option value="">-- Select Doctor --</option>
                  {availableDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.detail})
                    </option>
                  ))}
                </select>
              </div>

              <div className="auth-form-group">
                <label htmlFor="reg-type" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Visit Type *</label>
                <select
                  id="reg-type"
                  className="auth-select"
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value)}
                  required
                  disabled={saving}
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #cbd2d9", borderRadius: "8px" }}
                >
                  <option value="OPD Consultation">OPD Consultation</option>
                  <option value="Specialist OPD">Specialist OPD</option>
                  <option value="Follow-up Consultation">Follow-up Consultation</option>
                  <option value="Emergency Consult">Emergency Consult</option>
                </select>
              </div>

              <div className="auth-form-group">
                <label htmlFor="reg-date" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Visit Date *</label>
                <input
                  id="reg-date"
                  type="date"
                  className="auth-input"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              <div className="auth-form-group">
                <label htmlFor="reg-complaint" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Chief Complaint / Reason</label>
                <textarea
                  id="reg-complaint"
                  className="auth-input"
                  placeholder="Short reason or symptoms for consultation..."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  disabled={saving}
                  rows={3}
                  style={{ resize: "vertical", fontFamily: "inherit", padding: "10px 12px" }}
                />
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
                {saving ? "Registering OPD Visit..." : "Create OPD Encounter"}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Viewing Encounter Detail Modal */}
      {viewingEncounter && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(10, 37, 64, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "600px",
            boxShadow: "0 20px 60px rgba(10, 37, 64, 0.15)",
            overflow: "hidden"
          }}>
            <div style={{
              background: "#f4f8fc",
              padding: "20px 24px",
              borderBottom: "1px solid var(--line, #e4e7eb)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h3 style={{ margin: 0, color: "var(--navy, #0a2540)", fontWeight: 850 }}>
                Clinical Encounter File ({viewingEncounter.encounterId})
              </h3>
              <button
                onClick={() => setViewingEncounter(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.2rem",
                  color: "var(--muted, #486581)",
                  cursor: "pointer",
                  fontWeight: 800
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Patient</span>
                  <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{viewingEncounter.patientName} ({viewingEncounter.patientId})</span>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Doctor</span>
                  <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{viewingEncounter.doctorName.startsWith("Dr.") ? viewingEncounter.doctorName : `Dr. ${viewingEncounter.doctorName}`} ({viewingEncounter.doctorId})</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Visit Date</span>
                  <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>
                    {new Date(viewingEncounter.visitDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Visit Type</span>
                  <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{viewingEncounter.visitType}</span>
                </div>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Encounter Status</span>
                <span style={{
                  display: "inline-block",
                  background: viewingEncounter.status === "completed" ? "#e2fbf0" : "#fffbeb",
                  color: viewingEncounter.status === "completed" ? "#10b981" : "#d97706",
                  border: viewingEncounter.status === "completed" ? "1px solid #a7f3d0" : "1px solid #fde68a",
                  borderRadius: "12px",
                  padding: "2px 8px",
                  fontSize: "0.75rem",
                  fontWeight: 750,
                  textTransform: "uppercase",
                  marginTop: "4px"
                }}>{viewingEncounter.status}</span>
              </div>

              <div style={{ borderTop: "1px solid var(--line, #e4e7eb)", paddingTop: "12px" }}>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Chief Complaint</span>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--navy, #0a2540)", whiteSpace: "pre-wrap", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                  {viewingEncounter.chiefComplaint || "No chief complaint recorded."}
                </p>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Symptoms / Clinical Notes</span>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--navy, #0a2540)", whiteSpace: "pre-wrap", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                  {viewingEncounter.symptoms || "No symptoms/clinical notes recorded."}
                </p>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Provisional Diagnosis</span>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--navy, #0a2540)", whiteSpace: "pre-wrap", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                  {viewingEncounter.provisionalDiagnosis || "No diagnosis documented yet."}
                </p>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Doctor's Consult Notes</span>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--navy, #0a2540)", whiteSpace: "pre-wrap", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                  {viewingEncounter.doctorNotes || "No medical recommendations documented."}
                </p>
              </div>

              {viewingEncounter.followUpDate && (
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Recommended Follow-up</span>
                  <span style={{ fontSize: "0.9rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>
                    {new Date(viewingEncounter.followUpDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            <div style={{
              background: "#f8fafc",
              padding: "16px 24px",
              borderTop: "1px solid var(--line, #e4e7eb)",
              display: "flex",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={() => setViewingEncounter(null)}
                style={{
                  background: "#0080ff",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 20px",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Close File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalVisitsView;
