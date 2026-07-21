import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./Auth.css";

interface DoctorsViewProps {
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

interface DoctorData {
  doctorId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  gender: string;
  department: string;
  specialization: string;
  qualification: string;
  medicalRegistrationNumber: string;
  yearsOfExperience: string;
  hospitalId: string;
  createdAt: string;
  status?: string;
}

interface DoctorDetail {
  doctorId: string;
  username: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  gender: string;
  hospitalId: string;
  department: string;
  specialization: string;
  qualification: string;
  medicalRegistrationNumber: string;
  yearsOfExperience: string;
  status: string;
  createdAt: string;
}

interface AssignedPatient {
  patientId: string;
  fullName: string;
  gender: string;
  dob: string;
  email: string;
  mobileNumber: string;
  status: string;
  assignedAt: string;
}

interface AvailablePatient {
  patientId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
}

const DoctorsView: React.FC<DoctorsViewProps> = ({ user }) => {
  const [doctors, setDoctors] = useState<DoctorData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Directory enrollment form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [gender, setGender] = useState("");
  const [department, setDepartment] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualification, setQualification] = useState("");
  const [medicalRegistrationNumber, setMedicalRegistrationNumber] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");

  // Created doctor success banner details
  const [enrolledDoctor, setEnrolledDoctor] = useState<{
    doctorId: string;
    fullName: string;
    email: string;
    tempPassword: string;
  } | null>(null);

  // Dedicated Doctor Profile states
  const [selectedDoctorIdForProfile, setSelectedDoctorIdForProfile] = useState<string | null>(null);
  const [doctorDetail, setDoctorDetail] = useState<DoctorDetail | null>(null);
  const [hospitalNameForProfile, setHospitalNameForProfile] = useState("");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Doctor master encounters states
  const [doctorEncounters, setDoctorEncounters] = useState<EncounterData[]>([]);
  const [viewingEncounterInModal, setViewingEncounterInModal] = useState<EncounterData | null>(null);

  // Doctor Assignments tab states
  const [activeDoctorTab, setActiveDoctorTab] = useState<"overview" | "patients" | "visits">("overview");
  const [assignedPatients, setAssignedPatients] = useState<AssignedPatient[]>([]);
  const [availablePatients, setAvailablePatients] = useState<AvailablePatient[]>([]);
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [selectedPatientToAssign, setSelectedPatientToAssign] = useState("");
  const [assigningPatient, setAssigningPatient] = useState(false);

  // Profile Edit states
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobileNumber, setEditMobileNumber] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editQualification, setEditQualification] = useState("");
  const [editMedicalRegistrationNumber, setEditMedicalRegistrationNumber] = useState("");
  const [editYearsOfExperience, setEditYearsOfExperience] = useState("");
  const [editStatus, setEditStatus] = useState("active");

  const fetchDoctors = async (query = "") => {
    try {
      const endpoint = query ? `/doctor/admin/search?q=${encodeURIComponent(query)}` : "/doctor/admin/list";
      const response = await api.get(endpoint);
      if (response.data.success) {
        setDoctors(response.data.doctors || []);
      } else {
        setError(response.data.message || "Failed to retrieve doctors.");
      }
    } catch (err) {
      console.error("Fetch doctors error:", err);
      setError("Failed to fetch doctors list from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadDoctors = async () => {
      try {
        const response = await api.get("/doctor/admin/list");
        if (active && response.data.success) {
          setDoctors(response.data.doctors || []);
        }
      } catch (err) {
        console.error("Fetch doctors error:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadDoctors();
    return () => {
      active = false;
    };
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchDoctors(searchQuery);
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    setLoading(true);
    fetchDoctors("");
  };

  const handleEnrollDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setEnrolledDoctor(null);
    setSaving(true);

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      mobileNumber: mobileNumber.trim(),
      gender,
      department: department.trim(),
      specialization: specialization.trim(),
      qualification: qualification.trim(),
      medicalRegistrationNumber: medicalRegistrationNumber.trim(),
      yearsOfExperience: yearsOfExperience.trim(),
    };

    try {
      const response = await api.post("/doctor/admin/create", payload);
      if (response.data.success) {
        setSuccess("Doctor enrolled successfully! Temporary login credentials generated below.");
        setEnrolledDoctor({
          doctorId: response.data.doctor.doctorId,
          fullName: response.data.doctor.fullName,
          email: response.data.doctor.email,
          tempPassword: response.data.temporaryPassword,
        });

        // Clear form
        setFullName("");
        setEmail("");
        setMobileNumber("");
        setGender("");
        setDepartment("");
        setSpecialization("");
        setQualification("");
        setMedicalRegistrationNumber("");
        setYearsOfExperience("");

        // Refetch list
        fetchDoctors(searchQuery);
      } else {
        setError(response.data.message || "Enrolling doctor failed.");
      }
    } catch (err) {
      console.error("Enroll doctor error:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Failed to enroll new doctor.");
    } finally {
      setSaving(false);
    }
  };

  const fetchDoctorAssignmentsData = async (dId: string) => {
    setAssignedLoading(true);
    try {
      const listRes = await api.get(`/assignment/doctor/${dId}/patients`);
      if (listRes.data.success) {
        setAssignedPatients(listRes.data.patients || []);
      }

      const availableRes = await api.get(`/assignment/available-patients?doctorId=${dId}`);
      if (availableRes.data.success) {
        setAvailablePatients(availableRes.data.patients || []);
      }
    } catch (err) {
      console.error("Error fetching doctor assignments info:", err);
    } finally {
      setAssignedLoading(false);
    }
  };

  const handleViewDoctor = async (dId: string) => {
    setSelectedDoctorIdForProfile(dId);
    setIsDetailLoading(true);
    setIsEditingProfile(false);
    setActiveDoctorTab("overview");
    setSelectedPatientToAssign("");
    setError("");
    setSuccess("");
    try {
      // Fetch details
      const detailRes = await api.get(`/doctor/admin/detail/${dId}`);
      if (detailRes.data.success) {
        const dd = detailRes.data.doctor;
        setDoctorDetail(dd);
        setHospitalNameForProfile(detailRes.data.hospitalName || "MediFlow Hospital");

        // Populate edit states
        setEditFullName(dd.fullName || "");
        setEditEmail(dd.email || "");
        setEditMobileNumber(dd.mobileNumber || "");
        setEditGender(dd.gender || "");
        setEditDepartment(dd.department || "");
        setEditSpecialization(dd.specialization || "");
        setEditQualification(dd.qualification || "");
        setEditMedicalRegistrationNumber(dd.medicalRegistrationNumber || "");
        setEditYearsOfExperience(dd.yearsOfExperience || "");
        setEditStatus(dd.status || "active");

        // Fetch assignment info
        await fetchDoctorAssignmentsData(dId);

        // Fetch master encounters info of this doctor
        const encRes = await api.get(`/encounter/doctor/${dId}`);
        if (encRes.data.success) {
          setDoctorEncounters(encRes.data.encounters || []);
        }
      } else {
        setError(detailRes.data.message || "Failed to load doctor profile details.");
      }
    } catch (err) {
      console.error("Error loading doctor detail:", err);
      setError("Failed to fetch doctor profile records.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleAssignPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientToAssign || !selectedDoctorIdForProfile) return;

    setError("");
    setSuccess("");
    setAssigningPatient(true);

    try {
      const res = await api.post("/assignment/assign", {
        doctorId: selectedDoctorIdForProfile,
        patientId: selectedPatientToAssign,
      });

      if (res.data.success) {
        setSuccess("Patient assigned to doctor successfully!");
        setSelectedPatientToAssign("");
        await fetchDoctorAssignmentsData(selectedDoctorIdForProfile);
      } else {
        setError(res.data.message || "Failed to assign patient.");
      }
    } catch (err) {
      console.error("Assign patient error:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Failed to assign patient.");
    } finally {
      setAssigningPatient(false);
    }
  };

  const handleRemoveAssignment = async (patientId: string) => {
    if (!selectedDoctorIdForProfile) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this doctor-patient assignment? This will deactivate the practitioner's access to this patient."
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");
    setAssignedLoading(true);

    try {
      const res = await api.post("/assignment/remove", {
        doctorId: selectedDoctorIdForProfile,
        patientId,
      });

      if (res.data.success) {
        setSuccess("Assignment successfully removed.");
        await fetchDoctorAssignmentsData(selectedDoctorIdForProfile);
      } else {
        setError(res.data.message || "Failed to remove assignment.");
      }
    } catch (err) {
      console.error("Remove assignment error:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Failed to remove assignment.");
    } finally {
      setAssignedLoading(false);
    }
  };

  const handleUpdateDoctorDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const response = await api.put(`/doctor/admin/update/${selectedDoctorIdForProfile}`, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        mobileNumber: editMobileNumber.trim(),
        gender: editGender,
        department: editDepartment.trim(),
        specialization: editSpecialization.trim(),
        qualification: editQualification.trim(),
        medicalRegistrationNumber: editMedicalRegistrationNumber.trim(),
        yearsOfExperience: editYearsOfExperience.trim(),
        status: editStatus,
      });

      if (response.data.success) {
        setSuccess("Doctor profile updated successfully!");
        if (doctorDetail) {
          setDoctorDetail({
            doctorId: doctorDetail.doctorId,
            username: doctorDetail.username,
            hospitalId: doctorDetail.hospitalId,
            createdAt: doctorDetail.createdAt,
            fullName: editFullName.trim(),
            email: editEmail.trim(),
            mobileNumber: editMobileNumber.trim(),
            gender: editGender,
            department: editDepartment.trim(),
            specialization: editSpecialization.trim(),
            qualification: editQualification.trim(),
            medicalRegistrationNumber: editMedicalRegistrationNumber.trim(),
            yearsOfExperience: editYearsOfExperience.trim(),
            status: editStatus,
          });
        }
        setIsEditingProfile(false);
        // Refresh doctor directory list
        fetchDoctors(searchQuery);
      } else {
        setError(response.data.message || "Failed to update doctor profile.");
      }
    } catch (err) {
      console.error("Error updating doctor profile:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Failed to save doctor profile updates.");
    } finally {
      setSaving(false);
    }
  };

  const renderDoctorsDirectory = () => {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
        {/* Page Header */}
        <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px" }}>
          <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
            Hospital Administration Module
          </p>
          <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
            Doctor Management & Enrollment
          </h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
            Search, monitor, and enroll professional clinical physicians in your hospital directory.
          </p>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: "20px" }} role="alert">{error}</div>}
        {success && <div className="auth-success" style={{ marginBottom: "20px" }} role="alert">{success}</div>}

        {/* Temporary Credentials Success Banner */}
        {enrolledDoctor && (
          <div style={{
            background: "#f0fdf4",
            border: "2px solid #22c55e",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "32px",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.15)"
          }}>
            <h3 style={{ color: "#166534", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "8px", fontWeight: 800 }}>
              🎉 Doctor Enrollment Completed!
            </h3>
            <p style={{ color: "#1b4332", margin: "0 0 16px 0", fontSize: "0.92rem", lineHeight: "1.5" }}>
              The doctor account has been created successfully. <strong>Please copy these temporary credentials and provide them to the doctor.</strong> They will be forced to choose a new password on their first login.
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
                <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Doctor Name</span>
                <span style={{ fontSize: "1rem", color: "#14532d", fontWeight: 700 }}>{enrolledDoctor.fullName}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Doctor ID (Login Username)</span>
                <span style={{ fontSize: "1rem", color: "#14532d", fontWeight: 700, fontFamily: "monospace" }}>{enrolledDoctor.doctorId}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Registered Email</span>
                <span style={{ fontSize: "1rem", color: "#14532d", fontWeight: 700 }}>{enrolledDoctor.email}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", color: "#166534", fontWeight: 800, textTransform: "uppercase" }}>Temporary Password</span>
                <span style={{ fontSize: "1rem", color: "#b91c1c", fontWeight: 800, fontFamily: "monospace" }}>{enrolledDoctor.tempPassword}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnrolledDoctor(null)}
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

          {/* Left Section: Search and Doctor List Table */}
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
                  placeholder="Search doctor by ID, Name, Department, or Spec..."
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
                Hospital Doctor Directory ({doctors.length})
              </h3>

              {loading ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
                  Loading enrolled doctors directory...
                </div>
              ) : doctors.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
                  No doctors found. Match your search query or enroll a new doctor.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Doctor ID</th>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Full Name</th>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Dept / Specialization</th>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Contact Details</th>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Status</th>
                      <th style={{ padding: "12px 8px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.75rem" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((d) => (
                      <tr key={d.doctorId} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }} className="table-row-hover">
                        <td style={{ padding: "14px 8px", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{d.doctorId}</td>
                        <td style={{ padding: "14px 8px", fontWeight: 750, color: "var(--navy, #0a2540)" }}>{d.fullName}</td>
                        <td style={{ padding: "14px 8px" }}>
                          <div style={{ fontWeight: 600, color: "var(--navy, #0a2540)" }}>{d.department}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--muted, #486581)" }}>{d.specialization}</div>
                        </td>
                        <td style={{ padding: "14px 8px" }}>
                          <div style={{ fontWeight: 600, color: "var(--navy, #0a2540)" }}>{d.email}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--muted, #486581)" }}>{d.mobileNumber}</div>
                        </td>
                        <td style={{ padding: "14px 8px" }}>
                          <span style={{
                            display: "inline-block",
                            background: d.status === "inactive" ? "#fee2e2" : "#e2fbf0",
                            color: d.status === "inactive" ? "#ef4444" : "#10b981",
                            borderRadius: "12px",
                            padding: "2px 8px",
                            fontSize: "0.75rem",
                            fontWeight: 750,
                            textTransform: "uppercase"
                          }}>
                            {d.status || "active"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 8px" }}>
                          <button
                            type="button"
                            onClick={() => handleViewDoctor(d.doctorId)}
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
                            View Doctor
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Section: Register New Doctor Form */}
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
                Enroll New Doctor
              </h3>
              <p style={{ margin: "0 0 20px 0", color: "var(--muted, #486581)", fontSize: "0.85rem", lineHeight: "1.4" }}>
                Complete the professional profile to generate a unique Doctor ID and temporary password.
              </p>

              <form onSubmit={handleEnrollDoctor} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="auth-form-group">
                  <label htmlFor="d-name" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Full Name</label>
                  <input
                    id="d-name"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Dr. Arthur Conan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="d-email" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Email Address</label>
                  <input
                    id="d-email"
                    type="email"
                    className="auth-input"
                    placeholder="e.g. arthur@mediflow.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="d-mobile" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Mobile Number</label>
                  <input
                    id="d-mobile"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. +14155554321"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="d-gender" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Gender</label>
                  <select
                    id="d-gender"
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

                <div className="auth-form-group">
                  <label htmlFor="d-department" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Department</label>
                  <input
                    id="d-department"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Cardiology"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="d-specialization" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Specialization</label>
                  <input
                    id="d-specialization"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Interventional Cardiology"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="d-qualification" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Qualification</label>
                  <input
                    id="d-qualification"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. MD, FACC"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="d-regno" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Medical Registration Number</label>
                  <input
                    id="d-regno"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. DMC-98765"
                    value={medicalRegistrationNumber}
                    onChange={(e) => setMedicalRegistrationNumber(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="d-experience" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Years of Experience</label>
                  <input
                    id="d-experience"
                    type="number"
                    className="auth-input"
                    placeholder="e.g. 12"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    required
                    disabled={saving}
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
                  {saving ? "Enrolling Doctor Account..." : "Create Doctor & Generate Password"}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderDoctorProfile = () => {
    if (isDetailLoading) {
      return (
        <div style={{ padding: "100px 0", textAlign: "center", color: "#0080ff" }}>
          <h3>Loading Doctor File Foundation...</h3>
          <p style={{ color: "var(--muted, #486581)", fontSize: "0.9rem" }}>Fetching credential and demographic isolations...</p>
        </div>
      );
    }

    if (!doctorDetail) {
      return (
        <div style={{ padding: "40px", textAlign: "center" }}>
          <p className="auth-error">Error: Doctor details not found or permission denied.</p>
          <button
            onClick={() => setSelectedDoctorIdForProfile(null)}
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
          onClick={() => setSelectedDoctorIdForProfile(null)}
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
          ← Back to Doctor Directory
        </button>

        {/* Page Header */}
        <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px" }}>
          <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
            Dedicated Doctor Profile
          </p>
          <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
            {doctorDetail.fullName}
          </h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
            Comprehensive professional details, qualification credentials, and hospital-level access settings.
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
                <form onSubmit={handleUpdateDoctorDetails} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="auth-form-group">
                    <label htmlFor="edit-d-name" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Full Name</label>
                    <input
                      id="edit-d-name"
                      type="text"
                      className="auth-input"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="edit-d-email" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Email Address</label>
                    <input
                      id="edit-d-email"
                      type="email"
                      className="auth-input"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="edit-d-mobile" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Mobile Number</label>
                    <input
                      id="edit-d-mobile"
                      type="text"
                      className="auth-input"
                      value={editMobileNumber}
                      onChange={(e) => setEditMobileNumber(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="edit-d-gender" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Gender</label>
                    <select
                      id="edit-d-gender"
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
                    <label htmlFor="edit-d-dept" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Department</label>
                    <input
                      id="edit-d-dept"
                      type="text"
                      className="auth-input"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="edit-d-spec" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Specialization</label>
                    <input
                      id="edit-d-spec"
                      type="text"
                      className="auth-input"
                      value={editSpecialization}
                      onChange={(e) => setEditSpecialization(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="edit-d-qual" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Qualification</label>
                    <input
                      id="edit-d-qual"
                      type="text"
                      className="auth-input"
                      value={editQualification}
                      onChange={(e) => setEditQualification(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="edit-d-regno" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Medical Reg Number</label>
                    <input
                      id="edit-d-regno"
                      type="text"
                      className="auth-input"
                      value={editMedicalRegistrationNumber}
                      onChange={(e) => setEditMedicalRegistrationNumber(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="edit-d-exp" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Years of Experience</label>
                    <input
                      id="edit-d-exp"
                      type="number"
                      className="auth-input"
                      value={editYearsOfExperience}
                      onChange={(e) => setEditYearsOfExperience(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="edit-d-status" style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Account Status</label>
                    <select
                      id="edit-d-status"
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
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Doctor ID</span>
                    <span style={{ fontSize: "1rem", color: "var(--navy, #0a2540)", fontWeight: 750, fontFamily: "monospace" }}>{doctorDetail.doctorId}</span>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Full Name</span>
                    <span style={{ fontSize: "1rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{doctorDetail.fullName}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Department</span>
                      <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{doctorDetail.department}</span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Gender</span>
                      <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{doctorDetail.gender}</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Specialization</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{doctorDetail.specialization}</span>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Qualification</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{doctorDetail.qualification}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Reg Number</span>
                      <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600, fontFamily: "monospace" }}>{doctorDetail.medicalRegistrationNumber}</span>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Experience</span>
                      <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{doctorDetail.yearsOfExperience} Years</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Mobile Number</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{doctorDetail.mobileNumber}</span>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Email</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600, wordBreak: "break-all" }}>{doctorDetail.email}</span>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Hospital</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{hospitalNameForProfile}</span>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Registration Date</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>
                      {doctorDetail.createdAt ? new Date(doctorDetail.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"}
                    </span>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "3px" }}>Account Status</span>
                    <span style={{
                      display: "inline-block",
                      background: doctorDetail.status === "inactive" ? "#fee2e2" : "#e3fcef",
                      border: doctorDetail.status === "inactive" ? "1px solid #ef4444" : "1px solid #00a389",
                      borderRadius: "20px",
                      padding: "4px 12px",
                      fontSize: "0.8rem",
                      color: doctorDetail.status === "inactive" ? "#991b1b" : "#006653",
                      fontWeight: 750,
                      textTransform: "uppercase"
                    }}>
                      {doctorDetail.status || "active"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Tabbed layout for Overview vs Assigned Patients */}
          <div>
            {/* Tab navigation */}
            <div style={{
              display: "flex",
              borderBottom: "2px solid #e2e8f0",
              marginBottom: "24px",
              gap: "20px",
              overflowX: "auto"
            }}>
              <button
                type="button"
                onClick={() => setActiveDoctorTab("overview")}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: activeDoctorTab === "overview" ? "3px solid #0080ff" : "3px solid transparent",
                  color: activeDoctorTab === "overview" ? "#0080ff" : "var(--muted, #486581)",
                  fontWeight: 750,
                  padding: "10px 0",
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  marginBottom: "-2px"
                }}
              >
                Overview
              </button>
              <button
                type="button"
                id="tab-assigned-patients"
                onClick={() => setActiveDoctorTab("patients")}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: activeDoctorTab === "patients" ? "3px solid #0080ff" : "3px solid transparent",
                  color: activeDoctorTab === "patients" ? "#0080ff" : "var(--muted, #486581)",
                  fontWeight: 750,
                  padding: "10px 0",
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  marginBottom: "-2px"
                }}
              >
                Assigned Patients
              </button>
              <button
                type="button"
                onClick={() => setActiveDoctorTab("visits")}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: activeDoctorTab === "visits" ? "3px solid #0080ff" : "3px solid transparent",
                  color: activeDoctorTab === "visits" ? "#0080ff" : "var(--muted, #486581)",
                  fontWeight: 750,
                  padding: "10px 0",
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  marginBottom: "-2px"
                }}
              >
                Consultations History
              </button>
            </div>

            {/* Tab Contents */}
            {activeDoctorTab === "visits" && (
              <div style={{
                background: "var(--surface, #ffffff)",
                border: "1px solid var(--line, #e4e7eb)",
                borderRadius: "14px",
                padding: "24px",
                boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
              }}>
                <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
                  Doctor OPD Consultation Logs
                </h3>

                {doctorEncounters.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted, #486581)", fontSize: "0.9rem" }}>
                    No OPD clinical consultations recorded for Dr. {doctorDetail.fullName} in this hospital.
                  </p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                        <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Visit ID</th>
                        <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Patient ID</th>
                        <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Patient Name</th>
                        <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Visit Date</th>
                        <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Type</th>
                        <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Status</th>
                        <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorEncounters.map((enc) => (
                        <tr key={enc.encounterId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 6px", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{enc.encounterId}</td>
                          <td style={{ padding: "12px 6px", fontWeight: 600, color: "var(--muted)" }}>{enc.patientId}</td>
                          <td style={{ padding: "12px 6px", fontWeight: 700, color: "var(--navy)" }}>{enc.patientName}</td>
                          <td style={{ padding: "12px 6px", fontWeight: 600, color: "var(--navy)" }}>
                            {new Date(enc.visitDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td style={{ padding: "12px 6px", color: "var(--muted)" }}>{enc.visitType}</td>
                          <td style={{ padding: "12px 6px" }}>
                            <span style={{
                              display: "inline-block",
                              background: enc.status === "completed" ? "#e2fbf0" : "#fffbeb",
                              color: enc.status === "completed" ? "#10b981" : "#d97706",
                              border: enc.status === "completed" ? "1px solid #a7f3d0" : "1px solid #fde68a",
                              borderRadius: "10px",
                              padding: "2px 6px",
                              fontSize: "0.7rem",
                              fontWeight: 750,
                              textTransform: "uppercase"
                            }}>
                              {enc.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 6px" }}>
                            <button
                              type="button"
                              onClick={() => setViewingEncounterInModal(enc)}
                              style={{
                                background: "#0080ff",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "4px",
                                padding: "4px 8px",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                cursor: "pointer",
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
            )}

            {activeDoctorTab === "overview" && (
              <div style={{
                background: "var(--surface, #ffffff)",
                border: "1px solid var(--line, #e4e7eb)",
                borderRadius: "14px",
                padding: "28px",
                boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
              }}>
                <h3 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.15rem", fontWeight: 800 }}>
                  Clinical Activity Profile
                </h3>
                <p style={{ color: "var(--muted, #486581)", fontSize: "0.92rem", lineHeight: "1.6" }}>
                  Dr. {doctorDetail.fullName} is registered as a practitioner of <strong>{doctorDetail.department} ({doctorDetail.specialization})</strong>. They have full authorization to view and update clinical patient records, trends, and diagnostic histories belonging strictly to <strong>{hospitalNameForProfile}</strong>.
                </p>
                <div style={{
                  marginTop: "24px",
                  padding: "16px",
                  borderRadius: "8px",
                  background: "#f4f8fc",
                  border: "1.5px solid #cbd5e1"
                }}>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#0080ff", textTransform: "uppercase", marginBottom: "8px" }}>Practice Integrity</span>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--navy, #0a2540)", lineHeight: "1.5" }}>
                    All clinical decisions, medical histories, vitals summaries, and reports viewed or submitted by this practitioner are subject to HIPAA and GDPR multi-tenant healthcare audit trails.
                  </p>
                </div>
              </div>
            )}

            {activeDoctorTab === "patients" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Assign Patient Box */}
                <div style={{
                  background: "var(--surface, #ffffff)",
                  border: "1px solid var(--line, #e4e7eb)",
                  borderRadius: "14px",
                  padding: "24px",
                  boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
                }}>
                  <h4 style={{ margin: "0 0 8px 0", color: "var(--navy, #0a2540)", fontSize: "1.1rem", fontWeight: 800 }}>
                    Assign Patient to Dr. {doctorDetail.fullName}
                  </h4>
                  <p style={{ margin: "0 0 16px 0", color: "var(--muted, #486581)", fontSize: "0.85rem", lineHeight: "1.4" }}>
                    Select an eligible patient from this hospital to assign them to this doctor's care team.
                  </p>

                  <form onSubmit={handleAssignPatient} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <select
                      id="assign-patient-select"
                      value={selectedPatientToAssign}
                      onChange={(e) => setSelectedPatientToAssign(e.target.value)}
                      required
                      style={{
                        flex: 1,
                        padding: "12px 14px",
                        border: "1.5px solid #cbd2d9",
                        borderRadius: "8px",
                        fontSize: "0.9rem",
                        fontFamily: "inherit"
                      }}
                      disabled={assigningPatient || assignedLoading}
                    >
                      <option value="">-- Select Patient --</option>
                      {availablePatients.map((p) => (
                        <option key={p.patientId} value={p.patientId}>
                          {p.fullName} ({p.patientId})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      id="btn-confirm-assign-patient"
                      disabled={!selectedPatientToAssign || assigningPatient || assignedLoading}
                      style={{
                        background: "#0080ff",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "12px 24px",
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {assigningPatient ? "Assigning..." : "Assign Patient"}
                    </button>
                  </form>
                </div>

                {/* Assigned Patients List Table */}
                <div style={{
                  background: "var(--surface, #ffffff)",
                  border: "1px solid var(--line, #e4e7eb)",
                  borderRadius: "14px",
                  padding: "24px",
                  boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)",
                  overflowX: "auto"
                }}>
                  <h4 style={{ margin: "0 0 16px 0", color: "var(--navy, #0a2540)", fontSize: "1.1rem", fontWeight: 800 }}>
                    Active Patient Assignments ({assignedPatients.length})
                  </h4>

                  {assignedLoading ? (
                    <div style={{ padding: "30px 0", textAlign: "center", color: "var(--muted, #486581)" }}>
                      Loading assigned patients...
                    </div>
                  ) : assignedPatients.length === 0 ? (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted, #486581)", border: "1px dashed var(--line)", borderRadius: "8px" }}>
                      No patients currently assigned to this doctor. Use the form above to assign a patient.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Patient ID</th>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Full Name</th>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Gender & DOB</th>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Assignment Date</th>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Status</th>
                          <th style={{ padding: "10px 6px", fontWeight: 750, color: "var(--muted, #486581)", textTransform: "uppercase", fontSize: "0.72rem" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedPatients.map((ap) => (
                          <tr key={ap.patientId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "12px 6px", fontWeight: 800, color: "#0080ff", fontFamily: "monospace" }}>{ap.patientId}</td>
                            <td style={{ padding: "12px 6px", fontWeight: 700, color: "var(--navy, #0a2540)" }}>{ap.fullName}</td>
                            <td style={{ padding: "12px 6px" }}>
                              <div style={{ fontWeight: 600 }}>{ap.gender}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--muted, #486581)" }}>DOB: {ap.dob}</div>
                            </td>
                            <td style={{ padding: "12px 6px", color: "var(--muted, #486581)", fontWeight: 600 }}>
                              {new Date(ap.assignedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td style={{ padding: "12px 6px" }}>
                              <span style={{
                                display: "inline-block",
                                background: ap.status === "inactive" ? "#fee2e2" : "#e2fbf0",
                                color: ap.status === "inactive" ? "#ef4444" : "#10b981",
                                borderRadius: "10px",
                                padding: "2px 6px",
                                fontSize: "0.7rem",
                                fontWeight: 750,
                                textTransform: "uppercase"
                              }}>
                                {ap.status}
                              </span>
                            </td>
                            <td style={{ padding: "12px 6px" }}>
                              <button
                                type="button"
                                className="btn-remove-assignment"
                                onClick={() => handleRemoveAssignment(ap.patientId)}
                                style={{
                                  background: "#fee2e2",
                                  color: "#ef4444",
                                  border: "1px solid #fca5a5",
                                  borderRadius: "6px",
                                  padding: "4px 8px",
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  };

  if (selectedDoctorIdForProfile) {
    const profileViewElement = renderDoctorProfile();
    return (
      <>
        {profileViewElement}
        {/* Viewing Encounter Detail Modal */}
        {viewingEncounterInModal && (
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
                  Clinical Encounter File ({viewingEncounterInModal.encounterId})
                </h3>
                <button
                  onClick={() => setViewingEncounterInModal(null)}
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
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Patient ID</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{viewingEncounterInModal.patientId}</span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Doctor</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{(viewingEncounterInModal.doctorName || doctorDetail?.fullName || "").startsWith("Dr.") ? (viewingEncounterInModal.doctorName || doctorDetail?.fullName || "") : `Dr. ${viewingEncounterInModal.doctorName || doctorDetail?.fullName || ""}`} ({viewingEncounterInModal.doctorId})</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Visit Date</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>
                      {new Date(viewingEncounterInModal.visitDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Visit Type</span>
                    <span style={{ fontSize: "0.95rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>{viewingEncounterInModal.visitType}</span>
                  </div>
                </div>

                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Encounter Status</span>
                  <span style={{
                    display: "inline-block",
                    background: viewingEncounterInModal.status === "completed" ? "#e2fbf0" : "#fffbeb",
                    color: viewingEncounterInModal.status === "completed" ? "#10b981" : "#d97706",
                    border: viewingEncounterInModal.status === "completed" ? "1px solid #a7f3d0" : "1px solid #fde68a",
                    borderRadius: "12px",
                    padding: "2px 8px",
                    fontSize: "0.75rem",
                    fontWeight: 750,
                    textTransform: "uppercase",
                    marginTop: "4px"
                  }}>{viewingEncounterInModal.status}</span>
                </div>

                <div style={{ borderTop: "1px solid var(--line, #e4e7eb)", paddingTop: "12px" }}>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Chief Complaint</span>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--navy, #0a2540)", whiteSpace: "pre-wrap", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                    {viewingEncounterInModal.chiefComplaint || "No chief complaint recorded."}
                  </p>
                </div>

                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Symptoms / Clinical Notes</span>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--navy, #0a2540)", whiteSpace: "pre-wrap", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                    {viewingEncounterInModal.symptoms || "No symptoms/clinical notes recorded."}
                  </p>
                </div>

                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Provisional Diagnosis</span>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--navy, #0a2540)", whiteSpace: "pre-wrap", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                    {viewingEncounterInModal.provisionalDiagnosis || "No diagnosis documented yet."}
                  </p>
                </div>

                <div>
                  <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Doctor's Consult Notes</span>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--navy, #0a2540)", whiteSpace: "pre-wrap", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                    {viewingEncounterInModal.doctorNotes || "No medical recommendations documented."}
                  </p>
                </div>

                {viewingEncounterInModal.followUpDate && (
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase" }}>Recommended Follow-up</span>
                    <span style={{ fontSize: "0.9rem", color: "var(--navy, #0a2540)", fontWeight: 600 }}>
                      {new Date(viewingEncounterInModal.followUpDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
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
                  onClick={() => setViewingEncounterInModal(null)}
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
      </>
    );
  }

  return renderDoctorsDirectory();
};

export default DoctorsView;
