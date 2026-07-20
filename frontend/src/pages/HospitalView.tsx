import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { type User } from "../App";
import "./Auth.css";

interface HospitalViewProps {
  user: User;
}

interface HospitalData {
  hospitalId: string;
  hospitalName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}

const HospitalView: React.FC<HospitalViewProps> = ({ user }) => {
  const [hospital, setHospital] = useState<HospitalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit fields
  const [hospitalName, setHospitalName] = useState("");
  const [logo, setLogo] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  useEffect(() => {
    const fetchHospital = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/hospital/current");
        if (response.data.success) {
          const data = response.data.hospital;
          setHospital(data);

          // Populate form states
          setHospitalName(data.hospitalName || "");
          setLogo(data.logo || "");
          setAddress(data.address || "");
          setCity(data.city || "");
          setState(data.state || "");
          setCountry(data.country || "");
          setPincode(data.pincode || "");
          setPhone(data.phone || "");
          setEmail(data.email || "");
          setWebsite(data.website || "");
          setStatus(data.status || "active");
        } else {
          setError(response.data.message || "Failed to load hospital profile.");
        }
      } catch (err) {
        console.error("Error loading hospital details:", err);
        setError("Unable to connect to the hospital profile service.");
      } finally {
        setLoading(false);
      }
    };

    fetchHospital();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const payload = {
      hospitalName: hospitalName.trim(),
      logo: logo.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      country: country.trim(),
      pincode: pincode.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      website: website.trim(),
      status,
    };

    try {
      const response = await api.put("/hospital/current", payload);
      if (response.data.success) {
        setSuccess("Hospital profile updated successfully.");
        setHospital(response.data.hospital);
        setIsEditing(false);
      } else {
        setError(response.data.message || "Failed to update hospital profile.");
      }
    } catch (err) {
      console.error("Error saving hospital profile:", err);
      const errRes = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(errRes?.message || "Failed to save hospital profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hospital) {
      setHospitalName(hospital.hospitalName || "");
      setLogo(hospital.logo || "");
      setAddress(hospital.address || "");
      setCity(hospital.city || "");
      setState(hospital.state || "");
      setCountry(hospital.country || "");
      setPincode(hospital.pincode || "");
      setPhone(hospital.phone || "");
      setEmail(hospital.email || "");
      setWebsite(hospital.website || "");
      setStatus(hospital.status || "active");
    }
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#0a2540" }}>
        <h3>Loading hospital clinical profile...</h3>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "20px" }}>
        <p className="summary-section__eyebrow" style={{ color: "#0080ff", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.85rem", margin: 0 }}>
          Enterprise Management Suite
        </p>
        <h1 style={{ margin: "4px 0 0 0", color: "var(--navy, #0a2540)", fontSize: "2rem", fontWeight: 850, letterSpacing: "-0.02em" }}>
          Hospital Profile Management
        </h1>
        <p style={{ margin: "4px 0 0 0", color: "var(--muted, #486581)", fontSize: "0.95rem" }}>
          Monitor, update, and manage your multi-tenant facility credentials and configuration details.
        </p>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: "20px" }} role="alert">{error}</div>}
      {success && <div className="auth-success" style={{ marginBottom: "20px" }} role="alert">{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px" }} className="profile-grid-layout">

        {/* Left Column: Hospital Identity Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* logo & general status card */}
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "32px 24px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
          }}>
            <div style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              backgroundColor: "#f4f8fc",
              border: "3px solid #0080ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px auto",
              overflow: "hidden"
            }}>
              {logo ? (
                <img src={logo} alt="Hospital Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "40px" }}>🏥</span>
              )}
            </div>

            <h3 style={{ margin: "0 0 4px 0", color: "var(--navy, #0a2540)", fontSize: "1.35rem", fontWeight: 850 }}>
              {hospital?.hospitalName}
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "var(--muted, #486581)", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase" }}>
              ID: {hospital?.hospitalId}
            </p>

            <span style={{
              display: "inline-block",
              background: hospital?.status === "active" ? "#e3fcef" : "#fee2e2",
              border: hospital?.status === "active" ? "1px solid #00a389" : "1px solid #ef4444",
              borderRadius: "20px",
              padding: "6px 16px",
              fontSize: "0.82rem",
              color: hospital?.status === "active" ? "#006653" : "#991b1b",
              fontWeight: 750,
              textTransform: "uppercase"
            }}>
              {hospital?.status === "active" ? "Active" : "Inactive"}
            </span>
          </div>

          {/* metadata card */}
          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
          }}>
            <h4 style={{ margin: "0 0 12px 0", color: "var(--navy, #0a2540)", fontSize: "0.95rem", fontWeight: 800, textTransform: "uppercase" }}>
              Facility Metadata
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.88rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted, #486581)", fontWeight: 600 }}>Registered:</span>
                <span style={{ color: "var(--navy, #0a2540)", fontWeight: 750 }}>
                  {hospital?.createdAt ? new Date(hospital.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted, #486581)", fontWeight: 600 }}>Last Updated:</span>
                <span style={{ color: "var(--navy, #0a2540)", fontWeight: 700 }}>
                  {hospital?.updatedAt ? new Date(hospital.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Detail Cards / Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

          <div style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--line, #e4e7eb)",
            borderRadius: "14px",
            padding: "28px",
            boxShadow: "0 10px 30px rgba(10, 37, 64, 0.04)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--line, #e4e7eb)", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, color: "var(--navy, #0a2540)", fontSize: "1.2rem", fontWeight: 800 }}>
                {isEditing ? "Edit Facility Details" : "Hospital Profile Details"}
              </h3>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: "#0080ff",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="auth-form-group">
                    <label htmlFor="h-name" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Hospital Name</label>
                    <input
                      id="h-name"
                      type="text"
                      className="auth-input"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="h-logo" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Logo Image URL</label>
                    <input
                      id="h-logo"
                      type="text"
                      className="auth-input"
                      placeholder="https://example.com/logo.png"
                      value={logo}
                      onChange={(e) => setLogo(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
                  <div className="auth-form-group">
                    <label htmlFor="h-address" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Street Address</label>
                    <input
                      id="h-address"
                      type="text"
                      className="auth-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="h-pincode" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Pincode / ZIP</label>
                    <input
                      id="h-pincode"
                      type="text"
                      className="auth-input"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                  <div className="auth-form-group">
                    <label htmlFor="h-city" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>City</label>
                    <input
                      id="h-city"
                      type="text"
                      className="auth-input"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="h-state" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>State</label>
                    <input
                      id="h-state"
                      type="text"
                      className="auth-input"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="h-country" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Country</label>
                    <input
                      id="h-country"
                      type="text"
                      className="auth-input"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="auth-form-group">
                    <label htmlFor="h-phone" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Contact Number</label>
                    <input
                      id="h-phone"
                      type="text"
                      className="auth-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="h-email" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Email Address</label>
                    <input
                      id="h-email"
                      type="email"
                      className="auth-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="auth-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="auth-form-group">
                    <label htmlFor="h-website" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Website URL</label>
                    <input
                      id="h-website"
                      type="text"
                      className="auth-input"
                      placeholder="https://example.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="h-status" style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "6px" }}>Status</label>
                    <select
                      id="h-status"
                      className="auth-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                      required
                      disabled={saving}
                      style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #cbd2d9", borderRadius: "8px" }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                  <button type="submit" className="auth-submit-btn" style={{ flex: 1, padding: "14px", borderRadius: "8px", background: "#0080ff", color: "#ffffff", fontWeight: 750, border: "none", cursor: "pointer" }} disabled={saving}>
                    {saving ? "Saving Updates..." : "Save Hospital Details"}
                  </button>
                  <button type="button" onClick={handleCancel} style={{ flex: 1, padding: "14px", borderRadius: "8px", background: "#f0f4f8", color: "#486581", fontWeight: 750, border: "1px solid #cbd5e1", cursor: "pointer" }} disabled={saving}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Hospital Name</span>
                    <span style={{ fontSize: "1rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{hospital?.hospitalName}</span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Facility ID</span>
                    <span style={{ fontSize: "1rem", color: "var(--navy, #0a2540)", fontWeight: 700, fontFamily: "monospace" }}>{hospital?.hospitalId}</span>
                  </div>
                </div>

                <div>
                  <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Street Address</span>
                  <span style={{ fontSize: "1rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{hospital?.address}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>City</span>
                    <span style={{ fontSize: "1rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{hospital?.city}</span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>State</span>
                    <span style={{ fontSize: "1rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{hospital?.state}</span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Pincode / ZIP</span>
                    <span style={{ fontSize: "1rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{hospital?.pincode}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Country</span>
                    <span style={{ fontSize: "1rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{hospital?.country}</span>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Contact Number</span>
                    <span style={{ fontSize: "1rem", color: "var(--navy, #0a2540)", fontWeight: 700 }}>{hospital?.phone}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Email Address</span>
                    <a href={`mailto:${hospital?.email}`} style={{ fontSize: "1rem", color: "#0080ff", fontWeight: 700, textDecoration: "none" }}>{hospital?.email}</a>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 750, color: "#627d98", textTransform: "uppercase", marginBottom: "4px" }}>Website</span>
                    {hospital?.website ? (
                      <a href={hospital.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: "1rem", color: "#0080ff", fontWeight: 700, textDecoration: "none" }}>{hospital.website}</a>
                    ) : (
                      <span style={{ fontSize: "1rem", color: "var(--muted, #486581)", fontWeight: 600 }}>N/A</span>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default HospitalView;
