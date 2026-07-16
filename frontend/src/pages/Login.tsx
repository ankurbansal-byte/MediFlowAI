import React, { useState } from "react";
import api from "../api/axios";
import "./Login.css";

interface LoginProps {
  onLoginSuccess: (user: { username: string; role: "doctor" | "patient"; patientId?: string }) => void;
}

interface LoginErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        username: username.trim(),
        password,
      });

      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem("mediflow_token", token);
        localStorage.setItem("mediflow_user", JSON.stringify(user));
        onLoginSuccess(user);
      } else {
        setError(response.data.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      const loginError = err as LoginErrorResponse;
      setError(
        loginError.response?.data?.message ||
          "Failed to connect to the server. Please verify the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo-mark">+</span>
          <h2>MediFlowAI</h2>
          <p>Clinical Intelligence & Patient Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error" role="alert">{error}</div>}

          <div className="login-form-group">
            <label htmlFor="username">Username / Patient ID</label>
            <input
              id="username"
              type="text"
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. doctor1 or PAT-101"
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>

        <div className="login-footer">
          <p>Demo Accounts:</p>
          <p><strong>Doctor:</strong> doctor1 / password</p>
          <p><strong>Patient:</strong> PAT-101 to PAT-106 / password</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
