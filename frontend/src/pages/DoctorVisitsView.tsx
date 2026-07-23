import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import TrendChart from "../components/TrendChart";
import AIInsights from "../components/AIInsights";
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
  spo2?: PatientSummaryRecord;
  respiratory_rate?: PatientSummaryRecord;
  height?: PatientSummaryRecord;
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

  // Encounter-specific vitals states
  const [encounterVitals, setEncounterVitals] = useState<Record<string, { value: string | number; unit: string }>>({});
  const [isVitalsLoading, setIsVitalsLoading] = useState(false);

  // Unified Patient details workspace states
  interface TimelineItem {
    parameter: string;
    value: string | number;
    unit: string;
    recordedAt: string;
    source: string;
  }

  interface WorkspaceTrendRecord {
    value: string | number;
    unit?: string;
    recordedAt?: string;
  }

  const [patientTimeline, setPatientTimeline] = useState<TimelineItem[]>([]);
  const [patientVisits, setPatientVisits] = useState<EncounterData[]>([]);
  const [trendRecords, setTrendRecords] = useState<WorkspaceTrendRecord[]>([]);
  const [selectedParameter, setSelectedParameter] = useState<"blood_sugar" | "blood_pressure" | "weight" | "heart_rate" | "body_temperature">("blood_sugar");
  const [trendPeriod, setTrendPeriod] = useState<7 | 30 | 90 | 365 | 36500>(30);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"overview" | "timeline" | "trends" | "insights" | "visits">("overview");

  const fetchEncounterVitals = async (encId: string) => {
    setIsVitalsLoading(true);
    try {
      const response = await api.get(`/encounter/vitals/${encId}`);
      if (response.data.success) {
        setEncounterVitals(response.data.vitals || {});
      }
    } catch (err) {
      console.error("Error fetching encounter vitals in doctor view:", err);
    } finally {
      setIsVitalsLoading(false);
    }
  };

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

  const fetchPatientTrend = async (pId: string, param: string, period: number) => {
    setIsTrendLoading(true);
    try {
      const response = await api.get(`/patient/trend/${pId}/${encodeURIComponent(param)}?days=${period}`);
      if (response.data.success) {
        setTrendRecords(response.data.records || []);
      }
    } catch (err) {
      console.error("Error fetching patient trend in doctor view:", err);
    } finally {
      setIsTrendLoading(false);
    }
  };

  const handleSelectParameter = async (param: "blood_sugar" | "blood_pressure" | "weight" | "heart_rate" | "body_temperature") => {
    setSelectedParameter(param);
    if (selectedEncounter) {
      await fetchPatientTrend(selectedEncounter.patientId, param, trendPeriod);
    }
  };

  const handleSelectPeriod = async (period: 7 | 30 | 90 | 365 | 36500) => {
    setTrendPeriod(period);
    if (selectedEncounter) {
      await fetchPatientTrend(selectedEncounter.patientId, selectedParameter, period);
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
    setPatientTimeline([]);
    setPatientVisits([]);
    setTrendRecords([]);
    setActiveWorkspaceTab("overview");
    setSelectedParameter("blood_sugar");
    setTrendPeriod(30);

    try {
      // 1. Fetch patient summary
      const response = await api.get(`/patient/summary/${enc.patientId}`);
      if (response.data.success) {
        setPatientSummary(response.data.summary);
      }

      // 2. Fetch patient timeline/history
      const timelineRes = await api.get(`/patient/timeline/${enc.patientId}`);
      if (timelineRes.data.success) {
        setPatientTimeline(timelineRes.data.records || []);
      }

      // 3. Fetch past encounters/visits
      const visitsRes = await api.get(`/encounter/patient/${enc.patientId}`);
      if (visitsRes.data.success) {
        setPatientVisits(visitsRes.data.encounters || []);
      }

      // 4. Fetch initial trend
      await fetchPatientTrend(enc.patientId, "blood_sugar", 30);
    } catch (err) {
      console.error("Error loading patient summary context:", err);
    } finally {
      setContextLoading(false);
    }

    await fetchEncounterVitals(enc.encounterId);
  };

  const handleCloseWorkspace = () => {
    setSelectedEncounter(null);
    setPatientSummary(null);
    setEncounterVitals({});
    setPatientTimeline([]);
    setPatientVisits([]);
    setTrendRecords([]);
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

            {/* Encounter Vitals Panel */}
            <div style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--line, #e4e7eb)",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
            }}>
              <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.1rem", fontWeight: 800, borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "10px" }}>
                Encounter Recorded Vitals
              </h3>

              {isVitalsLoading ? (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
                  Loading encounter vitals...
                </div>
              ) : Object.keys(encounterVitals).length === 0 ? (
                <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.85rem" }}>
                  No structured vitals recorded during this OPD visit yet.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Blood Sugar */}
                  {encounterVitals.blood_sugar && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>🩸 Blood Sugar:</span>
                      <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                        {encounterVitals.blood_sugar.value} {encounterVitals.blood_sugar.unit}
                      </strong>
                    </div>
                  )}

                  {/* Blood Pressure */}
                  {encounterVitals.blood_pressure && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>🩺 Blood Pressure:</span>
                      <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                        {encounterVitals.blood_pressure.value} {encounterVitals.blood_pressure.unit}
                      </strong>
                    </div>
                  )}

                  {/* Heart Rate */}
                  {encounterVitals.heart_rate && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>❤️ Heart Rate:</span>
                      <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                        {encounterVitals.heart_rate.value} {encounterVitals.heart_rate.unit}
                      </strong>
                    </div>
                  )}

                  {/* Temperature */}
                  {encounterVitals.body_temperature && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>🌡️ Temperature:</span>
                      <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                        {encounterVitals.body_temperature.value} {encounterVitals.body_temperature.unit}
                      </strong>
                    </div>
                  )}

                  {/* SpO2 */}
                  {encounterVitals.spo2 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>🫁 SpO2:</span>
                      <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                        {encounterVitals.spo2.value} {encounterVitals.spo2.unit}
                      </strong>
                    </div>
                  )}

                  {/* Respiratory Rate */}
                  {encounterVitals.respiratory_rate && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>🌬️ Respiratory Rate:</span>
                      <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                        {encounterVitals.respiratory_rate.value} {encounterVitals.respiratory_rate.unit}
                      </strong>
                    </div>
                  )}

                  {/* Weight */}
                  {encounterVitals.weight && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>⚖️ Weight:</span>
                      <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                        {encounterVitals.weight.value} {encounterVitals.weight.unit}
                      </strong>
                    </div>
                  )}

                  {/* Height */}
                  {encounterVitals.height && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "4px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>📏 Height:</span>
                      <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                        {encounterVitals.height.value} {encounterVitals.height.unit}
                      </strong>
                    </div>
                  )}
                </div>
              )}
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
                Latest Clinical Vitals Summary (All-Time)
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>🌡️ Temperature:</span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                      {patientSummary.body_temperature?.value || "—"} {patientSummary.body_temperature?.unit || ""}
                    </strong>
                  </div>

                  {/* SpO2 */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>🫁 SpO2:</span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                      {patientSummary.spo2?.value || "—"} {patientSummary.spo2?.unit || ""}
                    </strong>
                  </div>

                  {/* Respiratory Rate */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "4px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted, #486581)" }}>🌬️ Respiratory Rate:</span>
                    <strong style={{ fontSize: "0.92rem", color: "var(--navy, #0a2540)" }}>
                      {patientSummary.respiratory_rate?.value || "—"} {patientSummary.respiratory_rate?.unit || ""}
                    </strong>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Lean Patient Workspace Views & Tabs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* Workspace Navigation Tabs */}
            <div style={{
              display: "flex",
              borderBottom: "2px solid #e2e8f0",
              gap: "20px",
              overflowX: "auto"
            }}>
              {([
                { id: "overview", label: "Patient Overview" },
                { id: "timeline", label: "Historical Records" },
                { id: "trends", label: "Health Trends" },
                { id: "insights", label: "AI Insights" },
                { id: "visits", label: "Visit History" }
              ] as const).map((tab) => {
                const isActive = activeWorkspaceTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`ws-tab-${tab.id}`}
                    type="button"
                    onClick={() => setActiveWorkspaceTab(tab.id)}
                    style={{
                      background: "none",
                      border: "none",
                      borderBottom: isActive ? "3px solid #0080ff" : "3px solid transparent",
                      color: isActive ? "#0080ff" : "var(--muted, #486581)",
                      fontWeight: 750,
                      padding: "12px 0",
                      fontSize: "0.95rem",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s ease",
                      marginBottom: "-2px"
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div style={{ minHeight: "350px" }}>
              {activeWorkspaceTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <h3 style={{ margin: 0, color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
                    Latest Physiological Vitals & Measurements
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>

                    {/* Blood Sugar */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>🩸</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Blood Glucose</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {patientSummary?.blood_sugar?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{patientSummary?.blood_sugar?.unit || "mg/dL"}</span>
                      </strong>
                      {patientSummary?.blood_sugar?.recordedAt && (
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.blood_sugar.recordedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Blood Pressure */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>🩺</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Blood Pressure</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {patientSummary?.blood_pressure?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{patientSummary?.blood_pressure?.unit || "mmHg"}</span>
                      </strong>
                      {patientSummary?.blood_pressure?.recordedAt && (
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.blood_pressure.recordedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Heart Rate */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>❤️</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Heart Rate / Pulse</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {patientSummary?.heart_rate?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{patientSummary?.heart_rate?.unit || "bpm"}</span>
                      </strong>
                      {patientSummary?.heart_rate?.recordedAt && (
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.heart_rate.recordedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Temperature */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>🌡️</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Temperature</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {patientSummary?.body_temperature?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{patientSummary?.body_temperature?.unit || "°C"}</span>
                      </strong>
                      {patientSummary?.body_temperature?.recordedAt && (
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.body_temperature.recordedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* SpO2 */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>🫁</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Oxygen Saturation</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {patientSummary?.spo2?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{patientSummary?.spo2?.unit || "%"}</span>
                      </strong>
                      {patientSummary?.spo2?.recordedAt && (
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.spo2.recordedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Respiratory Rate */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>🌬️</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Respiratory Rate</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {patientSummary?.respiratory_rate?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{patientSummary?.respiratory_rate?.unit || "breaths/min"}</span>
                      </strong>
                      {patientSummary?.respiratory_rate?.recordedAt && (
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.respiratory_rate.recordedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Weight */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>⚖️</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Weight</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {patientSummary?.weight?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{patientSummary?.weight?.unit || "kg"}</span>
                      </strong>
                      {patientSummary?.weight?.recordedAt && (
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.weight.recordedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Height */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>📏</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Height</span>
                      <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                        {patientSummary?.height?.value || "—"} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>{patientSummary?.height?.unit || "cm"}</span>
                      </strong>
                      {patientSummary?.height?.recordedAt && (
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.height.recordedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {activeWorkspaceTab === "timeline" && (
                <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "14px", padding: "24px" }}>
                  <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.1rem", fontWeight: 800 }}>
                    Historical Physical Measurement Logs
                  </h3>
                  {patientTimeline.length === 0 ? (
                    <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.88rem" }}>
                      No physiological records exist in this patient's medical timeline.
                    </p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase", fontSize: "0.72rem" }}>Recorded At</th>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase", fontSize: "0.72rem" }}>Parameter</th>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase", fontSize: "0.72rem" }}>Value</th>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase", fontSize: "0.72rem" }}>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientTimeline.map((record, index) => {
                          const displayParam = record.parameter.toUpperCase().replace("_", " ");
                          return (
                            <tr key={index} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "12px 6px", color: "var(--navy)", fontWeight: 600 }}>
                                {new Date(record.recordedAt).toLocaleString()}
                              </td>
                              <td style={{ padding: "12px 6px", fontWeight: 700, color: "#0080ff" }}>{displayParam}</td>
                              <td style={{ padding: "12px 6px", fontWeight: 750, color: "var(--navy)" }}>
                                {record.value} {record.unit}
                              </td>
                              <td style={{ padding: "12px 6px", color: "var(--muted)", textTransform: "capitalize" }}>
                                {record.source}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeWorkspaceTab === "trends" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--line, #e4e7eb)", borderRadius: "12px", padding: "16px" }}>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "8px" }}>
                      Select Health Parameter
                    </span>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {([
                        { id: "blood_sugar", label: "Blood Sugar" },
                        { id: "blood_pressure", label: "Blood Pressure" },
                        { id: "heart_rate", label: "Heart Rate" },
                        { id: "body_temperature", label: "Temperature" },
                        { id: "weight", label: "Weight" }
                      ] as const).map((param) => (
                        <button
                          key={param.id}
                          type="button"
                          onClick={() => handleSelectParameter(param.id)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "6px",
                            border: selectedParameter === param.id ? "2px solid #0080ff" : "1px solid var(--line, #e4e7eb)",
                            background: selectedParameter === param.id ? "#f4f8fc" : "transparent",
                            color: selectedParameter === param.id ? "#0080ff" : "var(--navy)",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {param.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <TrendChart
                    records={trendRecords}
                    period={trendPeriod}
                    onPeriodChange={(p) => handleSelectPeriod(p)}
                    isLoading={isTrendLoading}
                    hasError={false}
                    parameter={selectedParameter}
                  />
                </div>
              )}

              {activeWorkspaceTab === "insights" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--line, #e4e7eb)", borderRadius: "12px", padding: "16px" }}>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "8px" }}>
                      Select Parameter for AI Observations
                    </span>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {([
                        { id: "blood_sugar", label: "Blood Sugar" },
                        { id: "blood_pressure", label: "Blood Pressure" },
                        { id: "heart_rate", label: "Heart Rate" },
                        { id: "body_temperature", label: "Temperature" },
                        { id: "weight", label: "Weight" }
                      ] as const).map((param) => (
                        <button
                          key={param.id}
                          type="button"
                          onClick={() => handleSelectParameter(param.id)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "6px",
                            border: selectedParameter === param.id ? "2px solid #0080ff" : "1px solid var(--line, #e4e7eb)",
                            background: selectedParameter === param.id ? "#f4f8fc" : "transparent",
                            color: selectedParameter === param.id ? "#0080ff" : "var(--navy)",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {param.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <AIInsights
                    records={trendRecords}
                    isLoading={isTrendLoading}
                    hasError={false}
                    parameter={selectedParameter}
                  />
                </div>
              )}

              {activeWorkspaceTab === "visits" && (
                <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "14px", padding: "24px" }}>
                  <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.1rem", fontWeight: 800 }}>
                    Patient OPD Visit History
                  </h3>
                  {patientVisits.length === 0 ? (
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.88rem" }}>No other visits found.</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase", fontSize: "0.72rem" }}>Visit ID</th>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase", fontSize: "0.72rem" }}>Visit Date</th>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase", fontSize: "0.72rem" }}>Visit Type</th>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase", fontSize: "0.72rem" }}>Doctor Name</th>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase", fontSize: "0.72rem" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientVisits.map((v) => (
                          <tr key={v.encounterId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "12px 6px", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{v.encounterId}</td>
                            <td style={{ padding: "12px 6px", fontWeight: 600 }}>{new Date(v.visitDate).toLocaleDateString()}</td>
                            <td style={{ padding: "12px 6px", color: "var(--muted)" }}>{v.visitType}</td>
                            <td style={{ padding: "12px 6px", fontWeight: 600 }}>{v.doctorName.startsWith("Dr.") ? v.doctorName : `Dr. ${v.doctorName}`}</td>
                            <td style={{ padding: "12px 6px" }}>
                              <span style={{
                                display: "inline-block",
                                background: v.status === "completed" ? "#e2fbf0" : "#fffbeb",
                                color: v.status === "completed" ? "#10b981" : "#d97706",
                                border: v.status === "completed" ? "1px solid #a7f3d0" : "1px solid #fde68a",
                                borderRadius: "10px",
                                padding: "2px 6px",
                                fontSize: "0.7rem",
                                fontWeight: 750,
                                textTransform: "uppercase"
                              }}>{v.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Optional Consultation Documentation Form (For 100% Backwards-Compatible Test Alignment) */}
            <div style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--line, #e4e7eb)",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "10px", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
                  Optional Traditional Consultation Details (Non-Required Workflow)
                </h3>
                <span style={{
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "#0080ff",
                  background: "#f4f8fc",
                  padding: "4px 10px",
                  borderRadius: "12px"
                }}>Optional Workflow</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Chief Complaint */}
                <div className="auth-form-group">
                  <label htmlFor="ws-complaint" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Chief Complaint</label>
                  <textarea
                    id="ws-complaint"
                    className="auth-input"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
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
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
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
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DoctorVisitsView;
