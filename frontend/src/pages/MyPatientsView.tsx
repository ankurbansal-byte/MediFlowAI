import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./Auth.css";

interface MyPatientsViewProps {
  user: User;
  onOpenPatient: (patientId: string, encounterId: string | null) => void;
}

interface AssignedPatient {
  patientId: string;
  fullName: string;
  gender: string;
  dob: string;
  email: string;
  mobileNumber: string;
  status: string;
  assignedAt?: string;
}

const MyPatientsView: React.FC<MyPatientsViewProps> = ({ user, onOpenPatient }) => {
  const [patients, setPatients] = useState<AssignedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchMyPatients = async () => {
      try {
        const profileRes = await api.get("/auth/profile");
        if (profileRes.data.success) {
          const dId = profileRes.data.profile.doctorId || "";
          if (dId) {
            const listRes = await api.get(`/assignment/doctor/${dId}/patients`);
            if (listRes.data.success) {
              setPatients(listRes.data.patients || []);
            } else {
              setError(listRes.data.message || "Failed to load assigned patients.");
            }
          } else {
            setError("Your account does not have an associated Doctor ID.");
          }
        }
      } catch (err) {
        console.error("Error loading assigned patients:", err);
        setError("Unable to retrieve assigned patients list.");
      } finally {
        setLoading(false);
      }
    };

    fetchMyPatients();
  }, [user]);

  // Search filter
  const filteredPatients = patients.filter((p) =>
    p.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px" }}>
        <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
          Clinician Care Portal
        </p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
          My Assigned Patients Directory
        </h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
          Full list of patients assigned to your care. View comprehensive health history, trends, and clinical timelines.
        </p>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: "20px" }} role="alert">{error}</div>}

      {/* Directory Card */}
      <div style={{
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--line, #e4e7eb)",
        borderRadius: "14px",
        padding: "24px",
        boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
      }}>
        {/* Search & Stats Bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          borderBottom: "1px solid #f1f5f9",
          paddingBottom: "16px"
        }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <input
              type="text"
              className="auth-input"
              placeholder="Search by Patient ID or Patient Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "12px 14px", width: "100%", maxWidth: "450px" }}
            />
          </div>
          <div>
            <span style={{
              fontSize: "0.85rem",
              fontWeight: 800,
              color: "#0080ff",
              background: "#f4f8fc",
              padding: "6px 14px",
              borderRadius: "12px"
            }}>
              Total Assigned Patients: {patients.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
            Loading assigned patients directory...
          </div>
        ) : filteredPatients.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
            {patients.length === 0
              ? "You have no assigned patients in your directory."
              : "No assigned patients match your search filter."}
          </div>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Patient ID</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Patient Name</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Gender</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Date of Birth</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Mobile Number</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Email</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Status</th>
                  <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => (
                  <tr key={p.patientId} style={{ borderBottom: "1px solid #f1f5f9" }} className="table-row-hover">
                    <td style={{ padding: "14px 8px", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{p.patientId}</td>
                    <td style={{ padding: "14px 8px", fontWeight: 750, color: "var(--navy, #0a2540)" }}>{p.fullName}</td>
                    <td style={{ padding: "14px 8px", color: "var(--muted, #486581)", fontWeight: 600 }}>{p.gender || "—"}</td>
                    <td style={{ padding: "14px 8px", color: "var(--navy, #0a2540)", fontWeight: 600 }}>
                      {p.dob ? new Date(p.dob).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "14px 8px", color: "var(--muted, #486581)", fontWeight: 600 }}>{p.mobileNumber || "—"}</td>
                    <td style={{ padding: "14px 8px", color: "var(--muted, #486581)", fontWeight: 600 }}>{p.email || "—"}</td>
                    <td style={{ padding: "14px 8px" }}>
                      <span style={{
                        display: "inline-block",
                        background: p.status === "inactive" ? "#fee2e2" : "#e2fbf0",
                        color: p.status === "inactive" ? "#ef4444" : "#10b981",
                        border: p.status === "inactive" ? "1px solid #fecaca" : "1px solid #a7f3d0",
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
                        onClick={() => onOpenPatient(p.patientId, null)}
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
  );
};

export default MyPatientsView;
