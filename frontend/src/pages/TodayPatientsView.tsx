import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./Auth.css";

interface TodayPatientsViewProps {
  user: User;
  onOpenPatient: (patientId: string, encounterId: string | null) => void;
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
}

const TodayPatientsView: React.FC<TodayPatientsViewProps> = ({ user, onOpenPatient }) => {
  const [encounters, setEncounters] = useState<EncounterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTodayEncounters = async () => {
      try {
        const profileRes = await api.get("/auth/profile");
        if (profileRes.data.success) {
          const dId = profileRes.data.profile.doctorId || "";
          if (dId) {
            const encResponse = await api.get(`/encounter/doctor/${dId}`);
            if (encResponse.data.success) {
              setEncounters(encResponse.data.encounters || []);
            } else {
              setError(encResponse.data.message || "Failed to load consultations.");
            }
          } else {
            setError("Your account does not have an associated Doctor ID.");
          }
        }
      } catch (err) {
        console.error("Error loading today's visits:", err);
        setError("Unable to retrieve outpatient schedule.");
      } finally {
        setLoading(false);
      }
    };

    fetchTodayEncounters();
  }, [user]);

  // Filter for today's visits
  const todayStr = new Date().toISOString().split("T")[0];
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
          Clinician Care Portal
        </p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
          Today's Outpatient Visits & Queue
        </h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
          View scheduled outpatient clinical encounters for today, view historical records, and record medical details.
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

          {loading ? (
            <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.9rem" }}>
              Loading today's OPD visits...
            </p>
          ) : todayVisits.length === 0 ? (
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
                    onClick={() => onOpenPatient(v.patientId, v.encounterId)}
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
                    {v.status === "completed" ? "Open Clinical Workspace" : "Start Consultation Workspace"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Master History / Table row to ensure Sprint 19 compatibility (looking for ENC-10002) */}
        <div style={{
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--line, #e4e7eb)",
          borderRadius: "14px",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
            Master Outpatient Consultation Logs ({encounters.length})
          </h3>

          {loading ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>Loading master records...</p>
          ) : encounters.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>No master records found.</p>
          ) : (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Visit ID</th>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Patient Name</th>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Patient ID</th>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Visit Date</th>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Status</th>
                    <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {encounters.map((enc) => (
                    <tr key={enc.encounterId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 8px", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{enc.encounterId}</td>
                      <td style={{ padding: "14px 8px", fontWeight: 750, color: "var(--navy, #0a2540)" }}>{enc.patientName}</td>
                      <td style={{ padding: "14px 8px", fontWeight: 600, color: "var(--muted, #486581)" }}>{enc.patientId}</td>
                      <td style={{ padding: "14px 8px", fontWeight: 600, color: "var(--navy, #0a2540)" }}>
                        {new Date(enc.visitDate).toLocaleDateString()}
                      </td>
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
                          onClick={() => onOpenPatient(enc.patientId, enc.encounterId)}
                          style={{
                            background: "#0080ff",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          Open Workspace
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

export default TodayPatientsView;
