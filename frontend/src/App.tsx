import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import PatientRegister from "./pages/PatientRegister";
import DoctorRegister from "./pages/DoctorRegister";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";

export interface User {
  username: string;
  role: "doctor" | "patient";
  patientId?: string;
  isEmailVerified?: boolean;
  email?: string;
  fullName?: string;
}

type ActiveView = "login" | "patient-register" | "doctor-register" | "forgot-password" | "reset-password" | "verify-email";

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("mediflow_user");
    const savedToken = localStorage.getItem("mediflow_token");

    if (savedUser && savedToken) {
      try {
        return JSON.parse(savedUser) as User;
      } catch (e) {
        console.error("Failed to parse saved user", e);
        localStorage.removeItem("mediflow_user");
        localStorage.removeItem("mediflow_token");
      }
    }
    return null;
  });

  // State derivation initialized dynamically to avoid synchronous setStates in useEffect
  const [urlToken] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  });

  const [activeView, setActiveView] = useState<ActiveView>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    const tokenParam = params.get("token");

    if (tokenParam) {
      if (viewParam === "reset-password") {
        return "reset-password";
      } else if (viewParam === "verify-email" || window.location.pathname.includes("verify-email")) {
        return "verify-email";
      }
    } else if (viewParam === "verify-email") {
      return "verify-email";
    }
    return "login";
  });

  const [successMessage, setSuccessMessage] = useState<string>("");

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveView("login");
  };

  const handleLogout = () => {
    localStorage.removeItem("mediflow_user");
    localStorage.removeItem("mediflow_token");
    localStorage.removeItem("mediflow_refresh_token");
    setUser(null);
    setActiveView("login");
  };

  const handleVerifySuccess = () => {
    if (user) {
      const updatedUser = { ...user, isEmailVerified: true };
      setUser(updatedUser);
      localStorage.setItem("mediflow_user", JSON.stringify(updatedUser));
    }
    setActiveView("login");
    // Clear URL params
    window.history.pushState({}, document.title, window.location.pathname);
  };

  const handleRegisterSuccess = (msg: string, patientId?: string) => {
    let finalMsg = msg;
    if (patientId) {
      finalMsg += ` Assigned Patient ID is: ${patientId}.`;
    }
    setSuccessMessage(finalMsg);
    setActiveView("login");
  };

  // Guard routing
  if (user) {
    // If user is logged in, check if email is verified
    // We treat user.isEmailVerified === false as unverified. (Old seeded users don't have this field or have it undefined/true, so they bypass verification)
    if (user.isEmailVerified === false) {
      return (
        <VerifyEmail
          tokenParam={urlToken}
          onVerifySuccess={handleVerifySuccess}
          onLogout={handleLogout}
          standalone={false}
        />
      );
    }
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  // Guest Routing
  switch (activeView) {
    case "patient-register":
      return (
        <PatientRegister
          onBackToLogin={() => setActiveView("login")}
          onRegisterSuccess={handleRegisterSuccess}
        />
      );
    case "doctor-register":
      return (
        <DoctorRegister
          onBackToLogin={() => setActiveView("login")}
          onRegisterSuccess={(msg) => handleRegisterSuccess(msg, undefined)}
        />
      );
    case "forgot-password":
      return (
        <ForgotPassword
          onBackToLogin={() => setActiveView("login")}
        />
      );
    case "reset-password":
      return (
        <ResetPassword
          tokenParam={urlToken}
          onBackToLogin={() => {
            setActiveView("login");
            window.history.pushState({}, document.title, window.location.pathname);
          }}
        />
      );
    case "verify-email":
      return (
        <VerifyEmail
          tokenParam={urlToken}
          onVerifySuccess={() => {
            setActiveView("login");
            window.history.pushState({}, document.title, window.location.pathname);
          }}
          onLogout={() => setActiveView("login")}
          standalone={true}
        />
      );
    case "login":
    default:
      return (
        <div style={{ position: "relative" }}>
          {successMessage && (
            <div
              style={{
                position: "fixed",
                top: "20px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 99999,
                backgroundColor: "#e3fcef",
                border: "1px solid #00a389",
                color: "#006653",
                padding: "15px 25px",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                maxWidth: "90%",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              {successMessage}
              <button
                onClick={() => setSuccessMessage("")}
                style={{
                  marginLeft: "15px",
                  background: "none",
                  border: "none",
                  color: "#006653",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          )}
          <Login
            onLoginSuccess={handleLoginSuccess}
            onOpenPatientRegister={() => { setSuccessMessage(""); setActiveView("patient-register"); }}
            onOpenDoctorRegister={() => { setSuccessMessage(""); setActiveView("doctor-register"); }}
            onOpenForgotPassword={() => { setSuccessMessage(""); setActiveView("forgot-password"); }}
          />
        </div>
      );
  }
}

export default App;
