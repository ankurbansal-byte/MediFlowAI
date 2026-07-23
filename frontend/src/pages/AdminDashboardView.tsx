import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import { type TabType } from "./Dashboard";
import "./Auth.css";

interface AdminDashboardViewProps {
  user: User;
  onTabChange: (tab: TabType) => void;
}

interface PatientData {
  patientId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  dob: string;
  gender: string;
  status: string;
  createdAt: string;
}

interface DoctorData {
  doctorId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  department: string;
  specialization: string;
  status: string;
}

interface EncounterData {
  encounterId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  visitDate: string;
  visitType: string;
  chiefComplaint: string;
  status: "draft" | "completed";
}

const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ user, onTabChange }) => {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [doctors, setDoctors] = useState<DoctorData[]>([]);
  const [encounters, setEncounters] = useState<EncounterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch patients, doctors, and encounters in parallel
        const [patientsRes, doctorsRes, encountersRes] = await Promise.all([
          api.get("/patient/admin/list"),
          api.get("/doctor/admin/list"),
          api.get("/encounter/hospital")
        ]);

        if (patientsRes.data.success) {
          setPatients(patientsRes.data.patients || []);
        }
        if (doctorsRes.data.success) {
          setDoctors(doctorsRes.data.doctors || []);
        }
        if (encountersRes.data.success) {
          setEncounters(encountersRes.data.encounters || []);
        }
      } catch (err) {
        console.error("Error loading Admin Dashboard data:", err);
        setError("Failed to fetch hospital operational overview statistics.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Calculations for Today's Visits
  const todayDateStr = new Date().toDateString();

  const todayVisits = encounters.filter((enc) => {
    if (!enc.visitDate) return false;
    return new Date(enc.visitDate).toDateString() === todayDateStr;
  });

  // Calculations for Recently Enrolled Patients (up to 5)
  const recentlyEnrolled = [...patients]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--muted, #486581)" }}>
        Loading hospital operational dashboard...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px" }}>
        <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
          Welcome, Admin {user.username.toUpperCase()}
        </p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2.2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
          Hospital Admin Overview
        </h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
          Monitor hospital-enrolled patients and active doctor profiles to manage relationships and ensure seamless longitudinal health-record access.
        </p>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: "20px" }} role="alert">{error}</div>}

      {/* High-Level Statistics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        {/* Total Patients */}
        <div style={{
          background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
          border: "1px solid #bae6fd",
          borderRadius: "14px",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 12px rgba(14, 165, 233, 0.05)"
        }}>
          <div>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Patients Enrolled
            </span>
            <h2 style={{ margin: "4px 0 0 0", fontSize: "2.5rem", fontWeight: 850, color: "#0f172a" }}>
              {patients.length}
            </h2>
          </div>
          <span style={{ fontSize: "2.5rem" }}>👥</span>
        </div>

        {/* Total Doctors */}
        <div style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
          border: "1px solid #bbf7d0",
          borderRadius: "14px",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 12px rgba(34, 197, 94, 0.05)"
        }}>
          <div>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Active Doctors
            </span>
            <h2 style={{ margin: "4px 0 0 0", fontSize: "2.5rem", fontWeight: 850, color: "#0f172a" }}>
              {doctors.length}
            </h2>
          </div>
          <span style={{ fontSize: "2.5rem" }}>🩺</span>
        </div>

        {/* Today's Visits */}
        <div style={{
          background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
          border: "1px solid #fde68a",
          borderRadius: "14px",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 12px rgba(245, 158, 11, 0.05)"
        }}>
          <div>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Today's OPD Visits
            </span>
            <h2 style={{ margin: "4px 0 0 0", fontSize: "2.5rem", fontWeight: 850, color: "#0f172a" }}>
              {todayVisits.length}
            </h2>
          </div>
          <span style={{ fontSize: "2.5rem" }}>📆</span>
        </div>
      </div>

      {/* Shortcuts & Quick Actions */}
      <div style={{
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--line, #e4e7eb)",
        borderRadius: "14px",
        padding: "24px",
        marginBottom: "32px",
        boxShadow: "0 10px 30px rgba(10, 37, 64, 0.03)"
      }}>
        <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
          ⚡ Quick Navigation
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <button
            type="button"
            onClick={() => onTabChange("patients")}
            style={{
              padding: "16px",
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
            className="table-row-hover"
          >
            <span style={{ fontSize: "1.8rem" }}>♙</span>
            <div>
              <strong style={{ display: "block", color: "var(--navy, #0a2540)", fontSize: "0.95rem" }}>Manage Patients</strong>
              <span style={{ fontSize: "0.78rem", color: "var(--muted, #486581)" }}>Enroll and look up profiles</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("doctors")}
            style={{
              padding: "16px",
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
            className="table-row-hover"
          >
            <span style={{ fontSize: "1.8rem" }}>🩺</span>
            <div>
              <strong style={{ display: "block", color: "var(--navy, #0a2540)", fontSize: "0.95rem" }}>Manage Doctors</strong>
              <span style={{ fontSize: "0.78rem", color: "var(--muted, #486581)" }}>Enlist and review schedules</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("visits-admin")}
            style={{
              padding: "16px",
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
            className="table-row-hover"
          >
            <span style={{ fontSize: "1.8rem" }}>📆</span>
            <div>
              <strong style={{ display: "block", color: "var(--navy, #0a2540)", fontSize: "0.95rem" }}>OPD / Today's Visits</strong>
              <span style={{ fontSize: "0.78rem", color: "var(--muted, #486581)" }}>Register consultations</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("hospital")}
            style={{
              padding: "16px",
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
            className="table-row-hover"
          >
            <span style={{ fontSize: "1.8rem" }}>🏥</span>
            <div>
              <strong style={{ display: "block", color: "var(--navy, #0a2540)", fontSize: "0.95rem" }}>Hospital Profile</strong>
              <span style={{ fontSize: "0.78rem", color: "var(--muted, #486581)" }}>Edit details & facility logo</span>
            </div>
          </button>
        </div>
      </div>

      {/* Limited Operational Information Grids */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "32px" }} className="profile-grid-layout">
        {/* Left Card: Today's OPD Visits Queue */}
        <div style={{
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--line, #e4e7eb)",
          borderRadius: "14px",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
            📆 Today's OPD Visits Queue ({todayVisits.length})
          </h3>

          {todayVisits.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.88rem" }}>
              No OPD consultation visits scheduled for today yet.
            </p>
          ) : (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Visit ID</th>
                    <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Patient</th>
                    <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Assigned Doctor</th>
                    <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Type</th>
                    <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayVisits.map((v) => (
                    <tr key={v.encounterId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 6px", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{v.encounterId}</td>
                      <td style={{ padding: "12px 6px", fontWeight: 700, color: "var(--navy)" }}>{v.patientName} <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>({v.patientId})</span></td>
                      <td style={{ padding: "12px 6px", fontWeight: 600 }}>{v.doctorName.startsWith("Dr.") ? v.doctorName : `Dr. ${v.doctorName}`}</td>
                      <td style={{ padding: "12px 6px", color: "var(--muted)" }}>{v.visitType}</td>
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
                        }}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Card: Recently Enrolled Patients */}
        <div style={{
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--line, #e4e7eb)",
          borderRadius: "14px",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
            ⚡ Recently Enrolled Patients
          </h3>

          {recentlyEnrolled.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.88rem" }}>
              No patients registered under this hospital tenancy yet.
            </p>
          ) : (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Patient ID</th>
                    <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Full Name</th>
                    <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Gender</th>
                    <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {recentlyEnrolled.map((p) => (
                    <tr key={p.patientId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 6px", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{p.patientId}</td>
                      <td style={{ padding: "12px 6px", fontWeight: 700, color: "var(--navy)" }}>{p.fullName}</td>
                      <td style={{ padding: "12px 6px", color: "var(--muted)" }}>{p.gender}</td>
                      <td style={{ padding: "12px 6px", color: "var(--muted)", fontWeight: 600 }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "—"}
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

export default AdminDashboardView;
