import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import PatientRegister from "./pages/PatientRegister";
import DoctorRegister from "./pages/DoctorRegister";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import ForcePasswordChange from "./pages/ForcePasswordChange";
import PublicHome from "./pages/PublicHome";
import HomepageV1 from "./pages/HomepageV1";
import HomepagePremium from "./pages/HomepagePremium";
import Doc2mePitchHeroV1 from "./pages/Doc2mePitchHeroV1";
import Doc2mePitchHeroV2Dark from "./pages/Doc2mePitchHeroV2Dark";
import Doc2mePitchHeroV3Aurora from "./pages/Doc2mePitchHeroV3Aurora";
import { clearAuthSession, isTokenExpired } from "./api/axios";

export interface User {
  username: string;
  role: "doctor" | "patient" | "admin";
  patientId?: string;
  doctorId?: string;
  isEmailVerified?: boolean;
  email?: string;
  fullName?: string;
  mustChangePassword?: boolean;
}

type ActiveView = "home" | "login" | "patient-register" | "doctor-register" | "forgot-password" | "reset-password" | "verify-email";

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("mediflow_user");
    const savedToken = localStorage.getItem("mediflow_token");

    if (savedUser && savedToken) {
      if (isTokenExpired(savedToken)) {
        console.warn("Saved token is expired on startup. Clearing auth session.");
        clearAuthSession();
        return null;
      }
      try {
        return JSON.parse(savedUser) as User;
      } catch (e) {
        console.error("Failed to parse saved user", e);
        clearAuthSession();
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
    return "home";
  });

  const [successMessage, setSuccessMessage] = useState<string>("");

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveView("login");
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    setActiveView("home");
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

  const handleProfileUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("mediflow_user", JSON.stringify(updatedUser));
  };

  // Doc2me Pitch Hero V1 Preview Route
  const isDoc2mePitchHeroV1 = window.location.pathname === "/design-preview/doc2me-pitch-hero-v1" ||
                              new URLSearchParams(window.location.search).get("view") === "design-preview-doc2me-pitch-hero-v1";

  if (isDoc2mePitchHeroV1) {
    return (
      <Doc2mePitchHeroV1
        onLoginClick={() => {
          setUser(null);
          clearAuthSession();
          setActiveView("login");
          window.history.pushState({}, document.title, "/?view=login");
        }}
      />
    );
  }

  // Doc2me Pitch Hero V3 Aurora Preview Route
  const isDoc2mePitchHeroV3Aurora = window.location.pathname === "/design-preview/doc2me-pitch-hero-v3-aurora" ||
                                    new URLSearchParams(window.location.search).get("view") === "design-preview-doc2me-pitch-hero-v3-aurora";

  if (isDoc2mePitchHeroV3Aurora) {
    return (
      <Doc2mePitchHeroV3Aurora
        onLoginClick={() => {
          setUser(null);
          clearAuthSession();
          setActiveView("login");
          window.history.pushState({}, document.title, "/?view=login");
        }}
      />
    );
  }

  // Doc2me Pitch Hero V2 Dark Preview Route
  const isDoc2mePitchHeroV2Dark = window.location.pathname === "/design-preview/doc2me-pitch-hero-v2-dark" ||
                                  new URLSearchParams(window.location.search).get("view") === "design-preview-doc2me-pitch-hero-v2-dark";

  if (isDoc2mePitchHeroV2Dark) {
    return (
      <Doc2mePitchHeroV2Dark
        onLoginClick={() => {
          setUser(null);
          clearAuthSession();
          setActiveView("login");
          window.history.pushState({}, document.title, "/?view=login");
        }}
      />
    );
  }

  // Homepage V1 Preview Route
  const isHomepageV1 = window.location.pathname === "/design-preview/homepage-v1" ||
                       new URLSearchParams(window.location.search).get("view") === "design-preview-homepage-v1";

  if (isHomepageV1) {
    return (
      <HomepageV1
        onLoginClick={() => {
          // Redirect to login view by clearing any existing state & pushing query params
          setUser(null);
          clearAuthSession();
          setActiveView("login");
          window.history.pushState({}, document.title, "/?view=login");
        }}
      />
    );
  }

  // Homepage Premium Preview Route
  const isHomepagePremium = window.location.pathname === "/design-preview/home-premium" ||
                            window.location.pathname === "/design-preview/doc2me-home-premium" ||
                            new URLSearchParams(window.location.search).get("view") === "design-preview-home-premium" ||
                            new URLSearchParams(window.location.search).get("view") === "design-preview-doc2me-home-premium";

  if (isHomepagePremium) {
    return (
      <HomepagePremium
        onLoginClick={() => {
          // Redirect to login view by clearing any existing state & pushing query params
          setUser(null);
          clearAuthSession();
          setActiveView("login");
          window.history.pushState({}, document.title, "/?view=login");
        }}
      />
    );
  }

  // Guard routing
  if (user) {
    if (user.mustChangePassword) {
      return (
        <ForcePasswordChange
          user={user}
          onPasswordChanged={() => {
            const updatedUser = { ...user, mustChangePassword: false };
            setUser(updatedUser);
            localStorage.setItem("mediflow_user", JSON.stringify(updatedUser));
          }}
          onLogout={handleLogout}
        />
      );
    }
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
    const isV2 = window.location.pathname === "/design-preview/home" ||
                 window.location.pathname === "/patient/home-v2" ||
                 new URLSearchParams(window.location.search).get("view") === "design-preview-home";
    const isV3 = window.location.pathname === "/design-preview/home-v3" ||
                 window.location.pathname === "/patient/home-v3" ||
                 new URLSearchParams(window.location.search).get("view") === "design-preview-home-v3";
    const isV4 = window.location.pathname === "/design-preview/home-v4" ||
                 window.location.pathname === "/patient/home-v4" ||
                 new URLSearchParams(window.location.search).get("view") === "design-preview-home-v4";
    const isV5_1 = window.location.pathname === "/design-preview/home-v5.1" ||
                   window.location.pathname === "/patient/home-v5.1" ||
                   new URLSearchParams(window.location.search).get("view") === "design-preview-home-v5.1";
    const isV5_2 = window.location.pathname === "/design-preview/home-v5-2" ||
                   window.location.pathname === "/patient/home-v5-2" ||
                   new URLSearchParams(window.location.search).get("view") === "design-preview-home-v5-2";
    const isV5 = window.location.pathname === "/design-preview/home-v5" ||
                 window.location.pathname === "/patient/home-v5" ||
                 new URLSearchParams(window.location.search).get("view") === "design-preview-home-v5";
    const isRecordsV5 = window.location.pathname === "/design-preview/health-records-v5" ||
                        window.location.pathname === "/patient/health-records-v5" ||
                        new URLSearchParams(window.location.search).get("view") === "design-preview-health-records-v5";
    const isRecordsV5_2 = window.location.pathname === "/design-preview/health-records-v5-2" ||
                          window.location.pathname === "/patient/health-records-v5-2" ||
                          new URLSearchParams(window.location.search).get("view") === "design-preview-health-records-v5-2";
    const isInsightsV5 = window.location.pathname === "/design-preview/health-insights-v5" ||
                         window.location.pathname === "/patient/health-insights-v5" ||
                         new URLSearchParams(window.location.search).get("view") === "design-preview-health-insights-v5";
    const isInsightsV5_2 = window.location.pathname === "/design-preview/health-insights-v5-2" ||
                           window.location.pathname === "/patient/health-insights-v5-2" ||
                           new URLSearchParams(window.location.search).get("view") === "design-preview-health-insights-v5-2";
    const isProfileV5 = window.location.pathname === "/design-preview/profile-v5" ||
                        window.location.pathname === "/patient/profile-v5" ||
                        new URLSearchParams(window.location.search).get("view") === "design-preview-profile-v5";
    const isProfileV5_2 = window.location.pathname === "/design-preview/profile-v5-2" ||
                          window.location.pathname === "/patient/profile-v5-2" ||
                          new URLSearchParams(window.location.search).get("view") === "design-preview-profile-v5-2";
    const isSettingsV5 = window.location.pathname === "/design-preview/settings-v5" ||
                         window.location.pathname === "/patient/settings-v5" ||
                         new URLSearchParams(window.location.search).get("view") === "design-preview-settings-v5";
    const isSettingsV5_2 = window.location.pathname === "/design-preview/settings-v5-2" ||
                           window.location.pathname === "/patient/settings-v5-2" ||
                           new URLSearchParams(window.location.search).get("view") === "design-preview-settings-v5-2";
    return <Dashboard user={user} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} isV2={isV2} isV3={isV3} isV4={isV4} isV5={isV5} isV5_1={isV5_1} isV5_2={isV5_2} isRecordsV5={isRecordsV5} isInsightsV5={isInsightsV5} isProfileV5={isProfileV5} isSettingsV5={isSettingsV5} isRecordsV5_2={isRecordsV5_2} isInsightsV5_2={isInsightsV5_2} isProfileV5_2={isProfileV5_2} isSettingsV5_2={isSettingsV5_2} />;
  }

  // Guest Routing
  switch (activeView) {
    case "home":
      return (
        <PublicHome
          onLoginClick={() => setActiveView("login")}
        />
      );
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
            onBackToHome={() => { setSuccessMessage(""); setActiveView("home"); }}
          />
        </div>
      );
  }
}

export default App;
