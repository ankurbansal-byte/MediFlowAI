import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./Auth.css";

interface DoctorHomeViewProps {
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
  status: "draft" | "completed";
}

interface AssignedPatient {
  patientId: string;
  fullName: string;
  gender: string;
  dob: string;
  mobileNumber: string;
}

const DoctorHomeView: React.FC<DoctorHomeViewProps> = ({ user, onOpenPatient }) => {
  const [assignedPatients, setAssignedPatients] = useState<AssignedPatient[]>([]);
  const [encounters, setEncounters] = useState<EncounterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search input
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const profileRes = await api.get("/auth/profile");
        if (profileRes.data.success) {
          const dId = profileRes.data.profile.doctorId || "";

          if (dId) {
            // Fetch assigned patients
            const assignedRes = await api.get(`/assignment/doctor/${dId}/patients`);
            if (assignedRes.data.success) {
              setAssignedPatients(assignedRes.data.patients || []);
            }

            // Fetch encounters
            const encRes = await api.get(`/encounter/doctor/${dId}`);
            if (encRes.data.success) {
              setEncounters(encRes.data.encounters || []);
            }
          }
        }
      } catch (err) {
        console.error("Error loading Doctor Home data:", err);
        setError("Failed to load doctor dashboard stats.");
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [user]);

  // Calculations
  const todayStr = new Date().toISOString().split("T")[0];
  const todayVisits = encounters.filter((enc) => {
    if (!enc.visitDate) return false;
    const encDateStr = new Date(enc.visitDate).toISOString().split("T")[0];
    return encDateStr === todayStr;
  });

  const recentActivities = [...encounters]
    .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
    .slice(0, 5);

  // Search filter matching ID, Name, or Mobile Number
  const filteredSearchPatients = searchQuery.trim() === ""
    ? assignedPatients
    : assignedPatients.filter((p) =>
        p.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.mobileNumber && p.mobileNumber.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--muted, #486581)" }}>
        Loading doctor dashboard...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px" }}>
        <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
          Welcome back, {user.username.toUpperCase()}
        </p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2.2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
          Doctor Dashboard & Care Hub
        </h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
          Review today's schedule, search assigned patients, and view recent activities at a glance.
        </p>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: "20px" }} role="alert">{error}</div>}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Today's Visits */}
        <div style={{
          background: "linear-gradient(135deg, #f4f8fc 0%, #e2f0fd 100%)",
          border: "1px solid #b3d7ff",
          borderRadius: "14px",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#006bd6", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Today's Scheduled Visits
            </span>
            <h2 style={{ margin: "4px 0 0 0", fontSize: "2.5rem", fontWeight: 850, color: "#0a2540" }}>
              {todayVisits.length}
            </h2>
          </div>
          <span style={{ fontSize: "2.5rem" }}>📆</span>
        </div>

        {/* Assigned Patients */}
        <div style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
          border: "1px solid #bbf7d0",
          borderRadius: "14px",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              My Assigned Patients
            </span>
            <h2 style={{ margin: "4px 0 0 0", fontSize: "2.5rem", fontWeight: 850, color: "#0a2540" }}>
              {assignedPatients.length}
            </h2>
          </div>
          <span style={{ fontSize: "2.5rem" }}>👥</span>
        </div>
      </div>

      {/* Main Grid split */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "32px" }} className="profile-grid-layout">

        {/* Left: Quick Search and Patient Directory */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          {/* Quick Patient Search Card */}
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
          }}>
            <h3 style={{ margin: "0 0 12px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
              🔍 Find Patient
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "var(--muted, #486581)", fontSize: "0.85rem" }}>
              Search across your assigned patients by Patient Name, ID, or Mobile number.
            </p>

            <div className="auth-form-group" style={{ marginBottom: "16px" }}>
              <input
                type="text"
                className="auth-input"
                placeholder="Type Name, ID (e.g. PAT-101), or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: "14px" }}
              />
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#627d98", fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {searchQuery.trim() === "" ? "My Assigned Patients" : "Search Results"}
              </h4>

              {filteredSearchPatients.length === 0 ? (
                <p style={{ margin: 0, color: "#ef4444", fontSize: "0.85rem", fontWeight: 600 }}>
                  No assigned patients match your search.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
                  {filteredSearchPatients.map((p) => (
                    <div
                      key={p.patientId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 14px",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        transition: "all 0.15s ease"
                      }}
                      className="table-row-hover"
                    >
                      <div>
                        <strong style={{ color: "#0a2540", fontSize: "0.95rem", display: "block" }}>{p.fullName}</strong>
                        <span style={{ fontSize: "0.78rem", color: "#486581", fontWeight: 600 }}>
                          ID: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{p.patientId}</span>
                          {p.gender && ` | ${p.gender}`}
                          {p.mobileNumber && ` | ${p.mobileNumber}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenPatient(p.patientId, null)}
                        style={{
                          background: "#0080ff",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "8px 14px",
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "background 0.15s ease"
                        }}
                      >
                        Open Workspace
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right: Today's Queue & Recent Activities */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          {/* Today's Queue Summary */}
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
          }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
              📆 Today's Queue Summary
            </h3>

            {todayVisits.length === 0 ? (
              <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.88rem" }}>
                You have no outpatient consultation visits scheduled for today.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {todayVisits.map((v) => (
                  <div
                    key={v.encounterId}
                    style={{
                      borderLeft: "4px solid #0080ff",
                      padding: "12px 16px",
                      background: "#f8fafc",
                      borderRadius: "0 8px 8px 0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", color: "var(--navy, #0a2540)", fontSize: "0.95rem" }}>
                        {v.patientName}
                      </strong>
                      <span style={{ fontSize: "0.78rem", color: "var(--muted, #486581)" }}>
                        ID: {v.patientId} | Type: {v.visitType}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenPatient(v.patientId, v.encounterId)}
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
                      Start Workspace
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity list */}
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
          }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
              ⚡ Relevant Recent Patient Activity
            </h3>

            {recentActivities.length === 0 ? (
              <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.88rem" }}>
                No recent patient visits recorded under your profile.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {recentActivities.map((v) => (
                  <div
                    key={v.encounterId}
                    style={{
                      paddingBottom: "14px",
                      borderBottom: "1px solid #f1f5f9",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", color: "var(--navy, #0a2540)", fontSize: "0.9rem" }}>
                        {v.patientName}
                      </strong>
                      <span style={{ display: "block", fontSize: "0.78rem", color: "var(--muted, #486581)" }}>
                        Visited: {new Date(v.visitDate).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#0080ff", fontWeight: 650 }}>
                        Complaint: "{v.chiefComplaint || "Routine checkup"}"
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenPatient(v.patientId, v.encounterId)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#0080ff",
                        fontWeight: 750,
                        fontSize: "0.82rem",
                        cursor: "pointer"
                      }}
                    >
                      View File
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default DoctorHomeView;
