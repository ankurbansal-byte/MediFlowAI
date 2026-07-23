import React, { useState, useEffect, useMemo } from "react";
import api from "../api/axios";
import TrendChart from "../components/TrendChart";
import AIInsights from "../components/AIInsights";
import "./Auth.css";

interface PatientWorkspaceProps {
  patientId: string;
  encounterId?: string | null;
  onBack: () => void;
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

// Age calculation helper
const calculateAge = (dobString?: string) => {
  if (!dobString) return "";
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age} Yrs`;
};

const PatientWorkspace: React.FC<PatientWorkspaceProps> = ({
  patientId,
  encounterId,
  onBack,
}) => {
  const [patientDetails, setPatientDetails] = useState<{
    fullName: string;
    gender: string;
    dob: string;
    mobileNumber: string;
    email: string;
  } | null>(null);

  const [selectedEncounter, setSelectedEncounter] = useState<EncounterData | null>(null);
  const [patientSummary, setPatientSummary] = useState<PatientSummaryMap | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Encounter-specific vitals states
  const [encounterVitals, setEncounterVitals] = useState<Record<string, { value: string | number; unit: string }>>({});
  const [isVitalsLoading, setIsVitalsLoading] = useState(false);

  // Unified Patient details workspace states
  const [patientTimeline, setPatientTimeline] = useState<TimelineItem[]>([]);
  const [patientVisits, setPatientVisits] = useState<EncounterData[]>([]);
  const [trendRecords, setTrendRecords] = useState<WorkspaceTrendRecord[]>([]);
  const [selectedParameter, setSelectedParameter] = useState<"blood_sugar" | "blood_pressure" | "weight" | "heart_rate" | "body_temperature">("blood_sugar");
  const [trendPeriod, setTrendPeriod] = useState<7 | 30 | 90 | 365 | 36500>(30);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"overview" | "timeline" | "trends" | "insights" | "visits">("overview");

  // Form input states (for optional consultation)
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEncounterVitals = async (encId: string) => {
    setIsVitalsLoading(true);
    try {
      const response = await api.get(`/encounter/vitals/${encId}`);
      if (response.data.success) {
        setEncounterVitals(response.data.vitals || {});
      }
    } catch (err) {
      console.error("Error fetching encounter vitals in workspace:", err);
    } finally {
      setIsVitalsLoading(false);
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
      console.error("Error fetching patient trend in workspace:", err);
    } finally {
      setIsTrendLoading(false);
    }
  };

  const handleSelectParameter = async (param: "blood_sugar" | "blood_pressure" | "weight" | "heart_rate" | "body_temperature") => {
    setSelectedParameter(param);
    await fetchPatientTrend(patientId, param, trendPeriod);
  };

  const handleSelectPeriod = async (period: 7 | 30 | 90 | 365 | 36500) => {
    setTrendPeriod(period);
    await fetchPatientTrend(patientId, selectedParameter, period);
  };

  useEffect(() => {
    const loadWorkspaceData = async () => {
      setContextLoading(true);
      setError("");
      setSuccess("");

      try {
        // 1. Fetch patient basic details
        const detailRes = await api.get(`/patient/admin/detail/${patientId}`);
        if (detailRes.data.success) {
          setPatientDetails(detailRes.data.patient);
        }

        // 2. Fetch patient summary
        const response = await api.get(`/patient/summary/${patientId}`);
        if (response.data.success) {
          setPatientSummary(response.data.summary);
        }

        // 3. Fetch patient timeline/history
        const timelineRes = await api.get(`/patient/timeline/${patientId}`);
        if (timelineRes.data.success) {
          setPatientTimeline(timelineRes.data.records || []);
        }

        // 4. Fetch past encounters/visits
        const visitsRes = await api.get(`/encounter/patient/${patientId}`);
        if (visitsRes.data.success) {
          setPatientVisits(visitsRes.data.encounters || []);
        }

        // 5. Fetch encounter details if encounterId is provided
        if (encounterId) {
          const encRes = await api.get(`/encounter/detail/${encounterId}`);
          if (encRes.data.success) {
            const enc = encRes.data.encounter;
            setSelectedEncounter(enc);
            setChiefComplaint(enc.chiefComplaint || "");
            setSymptoms(enc.symptoms || "");
            setProvisionalDiagnosis(enc.provisionalDiagnosis || "");
            setDoctorNotes(enc.doctorNotes || "");
            setFollowUpDate(enc.followUpDate ? enc.followUpDate.split("T")[0] : "");

            await fetchEncounterVitals(encounterId);
          }
        }

        // 6. Fetch initial trend
        await fetchPatientTrend(patientId, "blood_sugar", 30);
      } catch (err) {
        console.error("Error loading workspace details:", err);
        setError("Unable to load patient records or access is unauthorized.");
      } finally {
        setContextLoading(false);
      }
    };

    loadWorkspaceData();
  }, [patientId, encounterId]);

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
        const updated = {
          ...selectedEncounter,
          ...payload,
          followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
        };
        setSelectedEncounter(updated);
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
      const saveRes = await api.put(`/encounter/update/${selectedEncounter.encounterId}`, payload);
      if (!saveRes.data.success) {
        setError(saveRes.data.message || "Failed to save progress before finalization.");
        setSaving(false);
        return;
      }

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

  const isCompleted = selectedEncounter?.status === "completed";

  // Trend Stats calculation
  const trendStats = useMemo(() => {
    if (trendRecords.length === 0) return null;

    const isBP = selectedParameter === "blood_pressure";
    const totalReadings = trendRecords.length;

    // Trend direction: comparing first (oldest) vs last (latest/newest) in the selected timeframe
    const oldest = trendRecords[0];
    const latest = trendRecords[trendRecords.length - 1];

    let trendDirection = { text: "Stable", icon: "→", color: "#475569" };

    if (isBP) {
      const oldestParts = String(oldest.value).split("/");
      const latestParts = String(latest.value).split("/");
      if (oldestParts.length === 2 && latestParts.length === 2) {
        const oldestSys = Number(oldestParts[0]);
        const latestSys = Number(latestParts[0]);
        if (!isNaN(oldestSys) && !isNaN(latestSys)) {
          const diff = latestSys - oldestSys;
          if (Math.abs(diff) >= 2) {
            trendDirection = diff > 0
              ? { text: "Rising BP", icon: "↗", color: "#ef4444" }
              : { text: "Falling BP", icon: "↘", color: "#10b981" };
          }
        }
      }

      const bpRecords = trendRecords.map(r => {
        const parts = String(r.value).split("/");
        return parts.length === 2 ? { sys: Number(parts[0]), dia: Number(parts[1]) } : null;
      }).filter((r): r is { sys: number; dia: number } => r !== null && !isNaN(r.sys) && !isNaN(r.dia));

      const sysValues = bpRecords.map(r => r.sys);
      const diaValues = bpRecords.map(r => r.dia);

      const highest = sysValues.length > 0 ? `${Math.max(...sysValues)}/${Math.max(...diaValues)}` : "—";
      const lowest = sysValues.length > 0 ? `${Math.min(...sysValues)}/${Math.min(...diaValues)}` : "—";
      const avgSys = sysValues.length > 0 ? Math.round(sysValues.reduce((s, v) => s + v, 0) / sysValues.length) : 0;
      const avgDia = diaValues.length > 0 ? Math.round(diaValues.reduce((s, v) => s + v, 0) / diaValues.length) : 0;
      const average = sysValues.length > 0 ? `${avgSys}/${avgDia}` : "—";

      return {
        totalReadings,
        latest: latest.value,
        average,
        highest,
        lowest,
        trendDirection,
        unit: "mmHg"
      };
    } else {
      const oldestVal = Number(oldest.value);
      const latestVal = Number(latest.value);
      if (!isNaN(oldestVal) && !isNaN(latestVal)) {
        const diff = latestVal - oldestVal;
        if (Math.abs(diff) >= 0.1) {
          trendDirection = diff > 0
            ? { text: "Rising", icon: "↗", color: "#ef4444" }
            : { text: "Falling", icon: "↘", color: "#10b981" };
        }
      }

      const numericValues = trendRecords.map(r => Number(r.value)).filter(v => !isNaN(v));
      const highest = numericValues.length > 0 ? Math.max(...numericValues) : "—";
      const lowest = numericValues.length > 0 ? Math.min(...numericValues) : "—";
      const average = numericValues.length > 0
        ? (numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length).toFixed(1)
        : "—";

      return {
        totalReadings,
        latest: latest.value,
        average,
        highest,
        lowest,
        trendDirection,
        unit: trendRecords[0]?.unit || ""
      };
    }
  }, [trendRecords, selectedParameter]);

  // Factual Health Summary calculation for Last 30 Days
  const factualSummaryBlocks = useMemo(() => {
    const parameters = [
      { key: "blood_sugar", label: "Blood Sugar", unit: "mg/dL" },
      { key: "blood_pressure", label: "Blood Pressure", unit: "mmHg" },
      { key: "heart_rate", label: "Heart Rate", unit: "bpm" },
      { key: "body_temperature", label: "Temperature", unit: "°C" },
      { key: "weight", label: "Weight", unit: "kg" }
    ];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return parameters.map((p) => {
      const records = patientTimeline.filter(
        (r) => r.parameter === p.key && new Date(r.recordedAt).getTime() >= thirtyDaysAgo.getTime()
      );

      if (records.length === 0) {
        return {
          key: p.key,
          label: p.label,
          hasData: false,
          text: `No ${p.label.toLowerCase()} readings recorded in the last 30 days.`
        };
      }

      if (p.key === "blood_pressure") {
        const bpRecords = records.map(r => {
          const parts = String(r.value).split("/");
          return parts.length === 2 ? { sys: Number(parts[0]), dia: Number(parts[1]) } : null;
        }).filter((r): r is { sys: number; dia: number } => r !== null && !isNaN(r.sys) && !isNaN(r.dia));

        if (bpRecords.length === 0) {
          return {
            key: p.key,
            label: p.label,
            hasData: false,
            text: `No valid BP readings in the last 30 days.`
          };
        }

        const sysVals = bpRecords.map(r => r.sys);
        const diaVals = bpRecords.map(r => r.dia);

        const latestVal = records[0].value;
        const minSys = Math.min(...sysVals);
        const maxSys = Math.max(...sysVals);
        const minDia = Math.min(...diaVals);
        const maxDia = Math.max(...diaVals);
        const avgSys = Math.round(sysVals.reduce((s, v) => s + v, 0) / sysVals.length);
        const avgDia = Math.round(diaVals.reduce((s, v) => s + v, 0) / diaVals.length);

        return {
          key: p.key,
          label: p.label,
          hasData: true,
          text: `Last 30 Days: ${records.length} BP readings recorded. Average: ${avgSys}/${avgDia} mmHg. Range: ${minSys}/${minDia} to ${maxSys}/${maxDia} mmHg. Latest: ${latestVal} mmHg.`
        };
      }

      const numericValues = records.map(r => Number(r.value)).filter(v => !isNaN(v));
      if (numericValues.length === 0) {
        return {
          key: p.key,
          label: p.label,
          hasData: false,
          text: `No numeric ${p.label.toLowerCase()} readings recorded in the last 30 days.`
        };
      }

      const latestVal = records[0].value;
      const minVal = Math.min(...numericValues);
      const maxVal = Math.max(...numericValues);
      const avgVal = (numericValues.reduce((s, v) => s + v, 0) / numericValues.length).toFixed(1);

      return {
        key: p.key,
        label: p.label,
        hasData: true,
        text: `Last 30 Days: ${records.length} ${p.label.toLowerCase()} readings recorded. Average: ${avgVal} ${p.unit}. Range: ${minVal}–${maxVal} ${p.unit}. Latest: ${latestVal} ${p.unit}.`
      };
    });
  }, [patientTimeline]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Back navigation button */}
      <button
        onClick={onBack}
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
        ← Back to list
      </button>

      {/* Page Header with Patient Identity Context */}
      <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
            PRACTITIONER CLINICAL WORKSPACE
          </p>
          <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2.2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
            {patientDetails?.fullName || "Loading Patient..."}
          </h1>
          <p style={{ margin: "6px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem", fontWeight: 600 }}>
            Patient ID: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{patientId}</span>
            {patientDetails?.dob && ` | DOB: ${new Date(patientDetails.dob).toLocaleDateString()} (${calculateAge(patientDetails.dob)})`}
            {patientDetails?.gender && ` | Gender: ${patientDetails.gender}`}
          </p>
        </div>
        {selectedEncounter && (
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
        )}
      </div>

      {error && <div className="auth-error" style={{ marginBottom: "20px" }} role="alert">{error}</div>}
      {success && <div className="auth-success" style={{ marginBottom: "20px" }} role="alert">{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: "32px" }} className="profile-grid-layout">

        {/* Left Column: Demographics + Vitals Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Demographics Card */}
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

            {contextLoading && !patientDetails ? (
              <p style={{ color: "var(--muted)" }}>Loading demographics...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.9rem" }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Full Name</span>
                  <span style={{ color: "var(--navy, #0a2540)", fontWeight: 700 }}>{patientDetails?.fullName || "—"}</span>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Patient ID</span>
                  <span style={{ color: "var(--navy, #0a2540)", fontWeight: 750, fontFamily: "monospace" }}>{patientId}</span>
                </div>
                {patientDetails?.gender && (
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Gender</span>
                    <span style={{ color: "var(--navy, #0a2540)", fontWeight: 600 }}>{patientDetails.gender}</span>
                  </div>
                )}
                {patientDetails?.dob && (
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Age / DOB</span>
                    <span style={{ color: "var(--navy, #0a2540)", fontWeight: 600 }}>
                      {new Date(patientDetails.dob).toLocaleDateString()} ({calculateAge(patientDetails.dob)})
                    </span>
                  </div>
                )}
                {patientDetails?.mobileNumber && (
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Mobile</span>
                    <span style={{ color: "var(--navy, #0a2540)", fontWeight: 600 }}>{patientDetails.mobileNumber}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Encounter Vitals Panel (Shown only when encounterId is present) */}
          {encounterId && (
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
          )}

          {/* Latest Clinical Vitals Summary (All-Time) */}
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

            {contextLoading && !patientSummary ? (
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

        {/* Right Column: Unified Tabbed Medical Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          {/* Workspace Navigation Tabs */}
          <div style={{
            display: "flex",
            borderBottom: "2px solid #e2e8f0",
            gap: "20px",
            overflowX: "auto"
          }}>
            {([
              { id: "overview", label: "Current Vitals" },
              { id: "timeline", label: "Historical Timeline" },
              { id: "trends", label: "Trends" },
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
                {/* 📊 Compact Factual Health Summary Card */}
                <div style={{
                  background: "var(--surface, #ffffff)",
                  border: "1.5px dashed #0080ff",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 4px 15px rgba(0, 128, 255, 0.03)"
                }}>
                  <h4 style={{ margin: "0 0 14px 0", color: "var(--navy, #0a2540)", fontSize: "1.05rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                    📊 Factual Clinical Summary (Last 30 Days)
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
                    {factualSummaryBlocks.map((block) => (
                      <div key={block.key} style={{ paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
                        <strong style={{ color: "#0080ff", textTransform: "uppercase", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>
                          {block.label}
                        </strong>
                        <p style={{ margin: 0, color: "var(--navy, #0a2540)", fontWeight: 600, fontStyle: block.hasData ? "normal" : "italic" }}>
                          {block.text}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "14px", padding: "10px", background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "8px", fontSize: "0.72rem", color: "#9d174d", fontWeight: 650, lineHeight: "1.4" }}>
                    ⚠️ Factual Clinical Disclaimer: This summary is automatically derived strictly from recorded patient-reported values. It is descriptive and factual only. It does not diagnose disease, recommend medication, change treatment, claim medical certainty, or make clinical decisions. Any clinical adjustments must be made by the licensed practitioner.
                  </div>
                </div>

                <h3 style={{ margin: "10px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
                  Latest Physiological Vitals & Measurements
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>

                  {/* Blood Sugar */}
                  <div style={{
                    background: "#ffffff",
                    border: "1px solid var(--line, #e4e7eb)",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    opacity: patientSummary?.blood_sugar ? 1 : 0.7
                  }}>
                    <span style={{ fontSize: "1.4rem" }}>🩸</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Blood Glucose</span>
                    {patientSummary?.blood_sugar ? (
                      <>
                        <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                          {patientSummary.blood_sugar.value} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)", fontWeight: 500 }}>{patientSummary.blood_sugar.unit || "mg/dL"}</span>
                        </strong>
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.blood_sugar.recordedAt).toLocaleDateString()}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: "0.88rem", color: "var(--muted, #486581)", fontStyle: "italic", fontWeight: 550 }}>
                        No data available
                      </span>
                    )}
                  </div>

                  {/* Blood Pressure */}
                  <div style={{
                    background: "#ffffff",
                    border: "1px solid var(--line, #e4e7eb)",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    opacity: patientSummary?.blood_pressure ? 1 : 0.7
                  }}>
                    <span style={{ fontSize: "1.4rem" }}>%</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Blood Pressure</span>
                    {patientSummary?.blood_pressure ? (
                      <>
                        <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                          {patientSummary.blood_pressure.value} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)", fontWeight: 500 }}>{patientSummary.blood_pressure.unit || "mmHg"}</span>
                        </strong>
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.blood_pressure.recordedAt).toLocaleDateString()}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: "0.88rem", color: "var(--muted, #486581)", fontStyle: "italic", fontWeight: 550 }}>
                        No data available
                      </span>
                    )}
                  </div>

                  {/* Heart Rate */}
                  <div style={{
                    background: "#ffffff",
                    border: "1px solid var(--line, #e4e7eb)",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    opacity: patientSummary?.heart_rate ? 1 : 0.7
                  }}>
                    <span style={{ fontSize: "1.4rem" }}>❤️</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Heart Rate / Pulse</span>
                    {patientSummary?.heart_rate ? (
                      <>
                        <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                          {patientSummary.heart_rate.value} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)", fontWeight: 500 }}>{patientSummary.heart_rate.unit || "bpm"}</span>
                        </strong>
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.heart_rate.recordedAt).toLocaleDateString()}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: "0.88rem", color: "var(--muted, #486581)", fontStyle: "italic", fontWeight: 550 }}>
                        No data available
                      </span>
                    )}
                  </div>

                  {/* Temperature */}
                  <div style={{
                    background: "#ffffff",
                    border: "1px solid var(--line, #e4e7eb)",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    opacity: patientSummary?.body_temperature ? 1 : 0.7
                  }}>
                    <span style={{ fontSize: "1.4rem" }}>🌡️</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Temperature</span>
                    {patientSummary?.body_temperature ? (
                      <>
                        <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                          {patientSummary.body_temperature.value} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)", fontWeight: 500 }}>{patientSummary.body_temperature.unit || "°C"}</span>
                        </strong>
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.body_temperature.recordedAt).toLocaleDateString()}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: "0.88rem", color: "var(--muted, #486581)", fontStyle: "italic", fontWeight: 550 }}>
                        No data available
                      </span>
                    )}
                  </div>

                  {/* Weight */}
                  <div style={{
                    background: "#ffffff",
                    border: "1px solid var(--line, #e4e7eb)",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    opacity: patientSummary?.weight ? 1 : 0.7
                  }}>
                    <span style={{ fontSize: "1.4rem" }}>⚖️</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase" }}>Weight</span>
                    {patientSummary?.weight ? (
                      <>
                        <strong style={{ fontSize: "1.3rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>
                          {patientSummary.weight.value} <span style={{ fontSize: "0.75rem", color: "var(--muted, #486581)", fontWeight: 500 }}>{patientSummary.weight.unit || "kg"}</span>
                        </strong>
                        <span style={{ fontSize: "0.72rem", color: "#627d98" }}>
                          As of {new Date(patientSummary.weight.recordedAt).toLocaleDateString()}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: "0.88rem", color: "var(--muted, #486581)", fontStyle: "italic", fontWeight: 550 }}>
                        No data available
                      </span>
                    )}
                  </div>

                </div>
              </div>
            )}

            {activeWorkspaceTab === "timeline" && (
              <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "14px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 20px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800, borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                  🏥 Longitudinal Health History Timeline
                </h3>
                {patientTimeline.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.88rem" }}>
                    No physiological records exist in this patient's medical timeline.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {patientTimeline.map((record, index) => {
                      const displayParam = record.parameter.replace("_", " ").toUpperCase().replace(/\b\w/g, c => c.toUpperCase());
                      const isNewest = index === 0;
                      const dateStr = new Date(record.recordedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      });

                      return (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "16px",
                            background: isNewest ? "#f0f9ff" : "#ffffff",
                            border: isNewest ? "1.5px solid #0080ff" : "1px solid var(--line, #e4e7eb)",
                            borderRadius: "10px",
                            boxShadow: isNewest ? "0 4px 12px rgba(0, 128, 255, 0.08)" : "none",
                            transition: "all 0.15s ease"
                          }}
                          className="table-row-hover"
                        >
                          <div>
                            <span style={{
                              fontSize: "0.82rem",
                              color: isNewest ? "#0080ff" : "#627d98",
                              fontWeight: 800,
                              display: "block",
                              marginBottom: "4px"
                            }}>
                              {dateStr}
                            </span>
                            <span style={{
                              fontSize: "1.05rem",
                              color: "var(--navy, #0a2540)",
                              fontWeight: 800,
                              display: "block"
                            }}>
                              {displayParam}
                            </span>
                            <span style={{
                              fontSize: "0.75rem",
                              color: "var(--muted, #486581)",
                              textTransform: "capitalize",
                              display: "block",
                              marginTop: "2px"
                            }}>
                              Source: {record.source}
                            </span>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <strong style={{
                              fontSize: "1.25rem",
                              color: isNewest ? "#0080ff" : "var(--navy, #0a2540)",
                              fontWeight: 850
                            }}>
                              {record.value} <span style={{ fontSize: "0.8rem", fontWeight: 650, color: "var(--muted)" }}>{record.unit}</span>
                            </strong>

                            {isNewest && (
                              <span style={{
                                "display": "block",
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                color: "#0080ff",
                                textTransform: "uppercase",
                                marginTop: "4px",
                                letterSpacing: "0.05em"
                              }}>
                                ✨ Latest Record
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

                {/* Factual statistics card grid for Selected Timeframe */}
                {trendStats && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "16px",
                    background: "#f8fafc",
                    border: "1px solid var(--line, #e4e7eb)",
                    borderRadius: "12px",
                    padding: "16px"
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Readings</span>
                      <strong style={{ fontSize: "1.2rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>{trendStats.totalReadings}</strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Latest</span>
                      <strong style={{ fontSize: "1.2rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>{trendStats.latest} <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500 }}>{trendStats.unit}</span></strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Average</span>
                      <strong style={{ fontSize: "1.2rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>{trendStats.average} <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500 }}>{trendStats.unit}</span></strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Range (Min–Max)</span>
                      <strong style={{ fontSize: "1.2rem", color: "var(--navy, #0a2540)", fontWeight: 800 }}>{trendStats.lowest}–{trendStats.highest}</strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Trend Direction</span>
                      <strong style={{ fontSize: "1.2rem", color: trendStats.trendDirection.color, fontWeight: 800, display: "flex", alignItems: "center", gap: "4px" }}>
                        {trendStats.trendDirection.text} {trendStats.trendDirection.icon}
                      </strong>
                    </div>
                  </div>
                )}

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
              <div style={{ background: "#ffffff", border: "1px solid var(--line, #e4e7eb)", borderRadius: "14px", padding: "24px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
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

          {/* Optional Traditional Consultation Details form (only visible if encounterId is present) */}
          {encounterId && selectedEncounter && (
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
          )}

        </div>

      </div>
    </div>
  );
};

export default PatientWorkspace;
