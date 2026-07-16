import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

export interface User {
  username: string;
  role: "doctor" | "patient";
  patientId?: string;
}

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

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("mediflow_user");
    localStorage.removeItem("mediflow_token");
    setUser(null);
  };

  return !user ? (
    <Login onLoginSuccess={handleLoginSuccess} />
  ) : (
    <Dashboard user={user} onLogout={handleLogout} />
  );
}

export default App;
