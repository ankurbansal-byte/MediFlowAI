import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./Auth.css";

interface DoctorVisitsViewProps {
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

interface PatientSummaryRecord {
  value: string | number;
  unit: string;
  recordedAt: string;
}

interface PatientSummaryMap {
  blood_sugar?: PatientSummaryRecord;
  blood_pressure?: PatientSummaryRecord;
  weight?: PatientSummaryRecord;
  heart_rate?: PatientSummaryRecord;
  body_temperature?: PatientSummaryRecord;
}

const DoctorVisitsView: React.FC<DoctorVisitsViewProps> = ({ user }) => {
  const [encounters, setEncounters] = useState<EncounterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [doctorId, setDoctorId] = useState("");

  // Workspace consultation fields
  const [selectedEncounter, setSelectedEncounter] = useState<EncounterData | null>(null);
  const [patientSummary, setPatientSummary] = useState<PatientSummaryMap | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  // Form input states
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDoctorProfileAndEncounters = async () => {
      try {
        const response = await api.get("/auth/profile");
        if (response.data.success) {
          const dId = response.data.profile.doctorId || "";
          setDoctorId(dId);
          if (dId) {
            const encResponse = await api.get(`/encounter/doctor/${dId}`);
            if (encResponse.data.success) {
              setEncounters(encResponse.data.encounters || []);
            } else {
              setError(encResponse.data.message || "Failed to load consultations.");
            }
          } else {
            setError("Your account does not have a registered Doctor ID associated.");
          }
        } else {
          setError("Failed to fetch doctor profile.");
        }
      } catch (err) {
        console.error("Error loading doctor profile:", err);
        setError("Unable to authenticate or retrieve practitioner credentials.");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorProfileAndEncounters();
  }, [user]);

  const fetchEncounters = async (dId: string) => {
    try {
      const response = await api.get(`/encounter/doctor/${dId}`);
      if (response.data.success) {
        setEncounters(response.data.encounters || []);
      }
    } catch (err) {
      console.error("Error fetching doctor encounters:", err);
    }
  };

  const handleOpenWorkspace = async (enc: EncounterData) => {
    setSelectedEncounter(enc);
    setChiefComplaint(enc.chiefComplaint || "");
    setSymptoms(enc.symptoms || "");
    setProvisionalDiagnosis(enc.provisionalDiagnosis || "");
    setDoctorNotes(enc.doctorNotes || "");
    setFollowUpDate(enc.followUpDate ? enc.followUpDate.split("T")[0] : "");

    // Load existing patient medical context (summary metrics)
    setContextLoading(true);
    setPatientSummary(null);
    try {
      const response = await api.get(`/patient/summary/${enc.patientId}`);
      if (response.data.success) {
        setPatientSummary(response.data.summary);
      }
    } catch (err) {
      console.error("Error loading patient summary context:", err);
    } finally {
      setContextLoading(false);
    }
  };

  const handleCloseWorkspace = () => {
    setSelectedEncounter(null);
    setPatientSummary(null);
    setError("");
    setSuccess("");
  };

  const handleSaveDraft = async () => {
    if (!selectedEncounter) return;

    setError("");
    setSuccess("");
    setSaving(true);

    const payload = {
      chiefComplaint,
      symptoms,
      provisionalDiagnosis,
      doctorNotes,
      followUpDate: followUpDate || null,
    };

    try {
      const response = await api.put(`/encounter/update/${selectedEncounter.encounterId}`, payload);
      if (response.data.success) {
        setSuccess("Consultation details saved successfully as Draft.");
        // Update local status in state
        const updated = {
          ...selectedEncounter,
          ...payload,
          followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
        };
        setSelectedEncounter(updated);
        // Refresh directory
        if (doctorId) {
          fetchEncounters(doctorId);
        }
      } else {
        setError(response.data.message || "Failed to save draft.");
      }
    } catch (err) {
      console.error("Save draft error:", err);
      setError("Could not save clinical draft to the server.");
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!selectedEncounter) return;

    const confirmed = window.confirm(
      "Are you sure you want to finalize this consultation? Once completed, clinical notes will be locked from casual editing."
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");
    setSaving(true);

    const payload = {
      chiefComplaint,
      symptoms,
      provisionalDiagnosis,
      doctorNotes,
      followUpDate: followUpDate || null,
    };

    try {
      // 1. Save progress first
      const saveRes = await api.put(`/encounter/update/${selectedEncounter.encounterId}`, payload);
      if (!saveRes.data.success) {
        setError(saveRes.data.message || "Failed to save progress before finalization.");
        setSaving(false);
        return;
      }

      // 2. Complete consultation
      const compRes = await api.post(`/encounter/complete/${selectedEncounter.encounterId}`);
      if (compRes.data.success) {
        setSuccess("Clinical consultation finalized and closed successfully.");
        const completed: EncounterData = {
          ...selectedEncounter,
          ...payload,
          status: "completed" as const,
          followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
        };
        setSelectedEncounter(completed);
        // Refresh directory
        if (doctorId) {
          fetchEncounters(doctorId);
        }
      } else {
        setError(compRes.data.message || "Failed to finalize consultation.");
      }
    } catch (err) {
      console.error("Complete consultation error:", err);
      setError("Could not complete the clinical consultation.");
    } finally {
      setSaving(false);
    }
  };

  // Separation: Today's visits filter
  const todayStr = new Date().toISOString().split("T")[0];
  const todayVisits = encounters.filter((enc) => {
    if (!enc.visitDate) return false;
    const encDateStr = new Date(enc.visitDate).toISOString().split("T")[0];
    return encDateStr === todayStr;
  });

  if (selectedEncounter) {
    const isCompleted = selectedEncounter.status === "completed";
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
        {/* Back navigation and title header */}
        <button
          onClick={handleCloseWorkspace}
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
          ← Back to Consultations List
        </button>

        {/* Page Header */}
        <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
              PRACTITIONER CLINICAL WORKSPACE
            </p>
            <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
              Consultation: {selectedEncounter.patientName}
            </h1>
            <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
              Encounter {selectedEncounter.encounterId} — Scheduled {new Date(selectedEncounter.visitDate).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div>
            <span style={{
              display: "inline-block",
              background: isCompleted ? "#e2fbf0" : "#fffbeb",
              color: isCompleted ? "#10b981" : "#d97706",
              border: isCompleted ? "1px solid #a7f3d0" : "1px solid #fde68a",
              borderRadius: "14px",
              padding: "6px 16px",
              fontSize: "0.85rem",
              fontWeight: 800,
              textTransform: "uppercase"
            }}>
              {selectedEncounter.status}
            </span>
          </div>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: "20px" }} role="alert">{error}</div>}
        {success && <div className="auth-success" style={{ marginBottom: "20px" }} role="alert">{success}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: "32px" }} className="profile-grid-layout">

          {/* Left Column: Existing Patient Context (Demographics + Vitals Summary) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* Context Card */}
            <div style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--line, #e4e7eb)",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
            }}>
              <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.1rem", fontWeight: 800, borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "10px" }}>
                Patient Identity Context
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.9rem" }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Full Name</span>
                  <span style={{ color: "var(--navy, #0a2540)", fontWeight: 700 }}>{selectedEncounter.patientName}</span>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Patient ID</span>
                  <span style={{ color: "var(--navy, #0a2540)", fontWeight: 750, fontFamily: "monospace" }}>{selectedEncounter.patientId}</span>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Visit Type</span>
                  <span style={{ color: "var(--navy, #0a2540)", fontWeight: 600 }}>{selectedEncounter.visitType}</span>
                </div>
              </div>
            </div>

            {/* Vitals Summary Card */}
            <div style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--line, #e4e7eb)",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
            }}>
              <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.1rem", fontWeight: 800, borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "10px" }}>
                Latest Clinical Vitals Summary
              </h3>

              {contextLoading ? (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
                  Loading patient medical summary...
                </div>
              ) : !patientSummary ? (
                <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.85rem" }}>
                  No historical health records found for this patient file.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Blood Sugar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>🩸 Blood Sugar:</span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                      {patientSummary.blood_sugar?.value || "—"} {patientSummary.blood_sugar?.unit || ""}
                    </strong>
                  </div>

                  {/* Blood Pressure */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>🩺 Blood Pressure:</span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                      {patientSummary.blood_pressure?.value || "—"} {patientSummary.blood_pressure?.unit || ""}
                    </strong>
                  </div>

                  {/* Weight */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>⚖️ Weight:</span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                      {patientSummary.weight?.value || "—"} {patientSummary.weight?.unit || ""}
                    </strong>
                  </div>

                  {/* Heart Rate */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>❤️ Heart Rate:</span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                      {patientSummary.heart_rate?.value || "—"} {patientSummary.heart_rate?.unit || ""}
                    </strong>
                  </div>

                  {/* Temperature */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "4px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>🌡️ Temperature:</span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                      {patientSummary.body_temperature?.value || "—"} {patientSummary.body_temperature?.unit || ""}
                    </strong>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Consultation Workspace Editor Form */}
          <div>
            <div style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--line, #e4e7eb)",
              borderRadius: "14px",
              padding: "28px",
              boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
            }}>
              <h3 style={{ margin: "0 0 20px 0", color: "var(--navy, #0a2540)", fontSize: "1.2rem", fontWeight: 800, borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "10px" }}>
                Consultation Records
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                {/* Chief Complaint */}
                <div className="auth-form-group">
                  <label htmlFor="ws-complaint" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Chief Complaint *</label>
                  <textarea
                    id="ws-complaint"
                    className="auth-input"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    required
                    disabled={isCompleted || saving}
                    rows={2}
                    style={{ resize: "vertical", fontFamily: "inherit", padding: "10px 12px" }}
                  />
                </div>

                {/* Symptoms / Notes */}
                <div className="auth-form-group">
                  <label htmlFor="ws-symptoms" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Symptoms / Clinical Notes</label>
                  <textarea
                    id="ws-symptoms"
                    className="auth-input"
                    placeholder="Enter patient symptoms, physical exam notes..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    disabled={isCompleted || saving}
                    rows={4}
                    style={{ resize: "vertical", fontFamily: "inherit", padding: "10px 12px" }}
                  />
                </div>

                {/* Provisional Diagnosis */}
                <div className="auth-form-group">
                  <label htmlFor="ws-diagnosis" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Provisional Diagnosis</label>
                  <input
                    id="ws-diagnosis"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Essential Hypertension, Obesity Grade I"
                    value={provisionalDiagnosis}
                    onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                    disabled={isCompleted || saving}
                  />
                </div>

                {/* Doctor Notes / Advice */}
                <div className="auth-form-group">
                  <label htmlFor="ws-notes" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Medical Recommendations / Advice</label>
                  <textarea
                    id="ws-notes"
                    className="auth-input"
                    placeholder="Advised diet plans, exercises, drug schedule prescriptions..."
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    disabled={isCompleted || saving}
                    rows={4}
                    style={{ resize: "vertical", fontFamily: "inherit", padding: "10px 12px" }}
                  />
                </div>

                {/* Follow-up Date */}
                <div className="auth-form-group">
                  <label htmlFor="ws-followup" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Recommended Follow-up Date</label>
                  <input
                    id="ws-followup"
                    type="date"
                    className="auth-input"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    disabled={isCompleted || saving}
                  />
                </div>

                {/* Action Buttons */}
                {!isCompleted ? (
                  <div style={{ display: "flex", gap: "16px", marginTop: "10px" }}>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="auth-submit-btn"
                      style={{
                        flex: 1,
                        padding: "14px",
                        borderRadius: "8px",
                        background: "#f1f5f9",
                        color: "#0a2540",
                        border: "1.5px solid #cbd5e1",
                        fontWeight: 750,
                        cursor: "pointer"
                      }}
                      disabled={saving}
                    >
                      {saving ? "Saving Draft..." : "Save Draft"}
                    </button>
                    <button
                      type="button"
                      id="btn-complete-consultation"
                      onClick={handleCompleteConsultation}
                      className="auth-submit-btn"
                      style={{
                        flex: 1,
                        padding: "14px",
                        borderRadius: "8px",
                        background: "#0080ff",
                        color: "#ffffff",
                        border: "none",
                        fontWeight: 750,
                        cursor: "pointer"
                      }}
                      disabled={saving}
                    >
                      {saving ? "Completing..." : "Complete Consultation"}
                    </button>
                  </div>
                ) : (
                  <div style={{
                    marginTop: "20px",
                    padding: "16px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    textAlign: "center"
                  }}>
                    <strong style={{ color: "#166534", fontSize: "0.95rem" }}>
                      🔒 Encounter File Finalized and Closed
                    </strong>
                    <p style={{ margin: "4px 0 0 0", color: "#15803d", fontSize: "0.82rem" }}>
                      This clinical record is now locked and read-only.
                    </p>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px" }}>
        <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
          Clinician Care Portal
        </p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
          OPD Visits & Consultations Workspace
        </h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
          Manage your schedule of outpatient consultations, view patient clinical context, and record structured electronic health charts.
        </p>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: "20px" }} role="alert">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>

        {/* Today's Schedule Card */}
        <div style={{
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--line, #e4e7eb)",
          borderRadius: "14px",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
            📆 Today's Scheduled OPD Consultations ({todayVisits.length})
          </h3>

          {todayVisits.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.9rem" }}>
              No outpatient consultation visits assigned to your schedule for today.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {todayVisits.map((v) => (
                <div
                  key={v.encounterId}
                  style={{
                    border: "1px solid var(--line, #e4e7eb)",
                    borderRadius: "10px",
                    padding: "16px",
                    background: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{v.encounterId}</span>
                      <span style={{
                        fontSize: "0.7rem",
                        fontWeight: 750,
                        textTransform: "uppercase",
                        color: v.status === "completed" ? "#10b981" : "#d97706"
                      }}>{v.status}</span>
                    </div>
                    <h4 style={{ margin: "0 0 4px 0", color: "var(--navy, #0a2540)", fontSize: "1rem", fontWeight: 800 }}>{v.patientName}</h4>
                    <p style={{ margin: "0 0 12px 0", fontSize: "0.82rem", color: "var(--muted, #486581)", fontWeight: 600 }}>Patient ID: {v.patientId}</p>
                    <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "var(--navy, #0a2540)", fontStyle: "italic" }}>
                      &ldquo;{v.chiefComplaint || "No complaint documented."}&rdquo;
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenWorkspace(v)}
                    style={{
                      background: v.status === "completed" ? "#f1f5f9" : "#0080ff",
                      color: v.status === "completed" ? "#475569" : "#ffffff",
                      border: v.status === "completed" ? "1px solid #cbd5e1" : "none",
                      borderRadius: "6px",
                      padding: "8px 16px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      width: "100%",
                      textAlign: "center"
                    }}
                  >
                    {v.status === "completed" ? "Open Clinical Record (Read-Only)" : "Start Consultation Workspace"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Master Consultations Directory Table */}
        <div style={{
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--line, #e4e7eb)",
          borderRadius: "14px",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.2rem", fontWeight: 800 }}>
            Master Consultation History Directory ({encounters.length})
          </h3>

          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
              Loading master schedule history...
            </div>
          ) : encounters.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
              No outpatient consultation visits assigned to your profile in this hospital.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Visit ID</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Patient Name</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Patient ID</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Visit Date</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Visit Type</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Status</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {encounters.map((enc) => (
                  <tr key={enc.encounterId} style={{ borderBottom: "1px solid #f1f5f9" }} className="table-row-hover">
                    <td style={{ padding: "14px 8px", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{enc.encounterId}</td>
                    <td style={{ padding: "14px 8px", fontWeight: 750, color: "var(--navy, #0a2540)" }}>{enc.patientName}</td>
                    <td style={{ padding: "14px 8px", fontWeight: 600, color: "var(--muted, #486581)" }}>{enc.patientId}</td>
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
                        onClick={() => handleOpenWorkspace(enc)}
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
                        {enc.status === "completed" ? "View File" : "Open Workspace"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
};

export default DoctorVisitsView;
