import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await authService.login({ username, password });
      if (data.user.role === "ADMIN") {
        navigate("/adminDashboard");
      } else {
        navigate("/customerDashboard");
      }
    } catch (err) {
      setError(err.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      {/* Background decoration */}
      <div style={bgDecoration1Style} />
      <div style={bgDecoration2Style} />

      <div style={containerStyle} className="animate-scale-in">
        {/* Logo */}
        <div style={logoContainerStyle}>
          <div style={logoIconStyle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 style={logoTextStyle}>Virtual House Renting</h1>
          <p style={logoSubtextStyle}>Sign in to your account</p>
        </div>

        {error && (
          <div style={errorBoxStyle} className="animate-fade-in-down">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={formStyle}>
          <div className="input-group">
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...submitButtonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div style={footerStyle}>
          <span style={{ color: "var(--gray-500)" }}>Don't have an account? </span>
          <button
            onClick={() => navigate("/register")}
            style={linkButtonStyle}
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #fef2f2 100%)",
  padding: "20px",
  position: "relative",
  overflow: "hidden",
};

const bgDecoration1Style = {
  position: "absolute",
  top: "-20%",
  right: "-10%",
  width: "500px",
  height: "500px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
  pointerEvents: "none",
};

const bgDecoration2Style = {
  position: "absolute",
  bottom: "-20%",
  left: "-10%",
  width: "500px",
  height: "500px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
  pointerEvents: "none",
};

const containerStyle = {
  width: "100%",
  maxWidth: "420px",
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  borderRadius: "var(--radius-2xl)",
  padding: "40px 36px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.6)",
  position: "relative",
  zIndex: 1,
};

const logoContainerStyle = {
  textAlign: "center",
  marginBottom: "32px",
};

const logoIconStyle = {
  width: "56px",
  height: "56px",
  borderRadius: "var(--radius-lg)",
  background: "linear-gradient(135deg, var(--primary-500), var(--accent-500))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 16px",
  boxShadow: "0 8px 24px rgba(59,130,246,0.3)",
};

const logoTextStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.8rem",
  fontWeight: 800,
  color: "var(--gray-900)",
  margin: 0,
  letterSpacing: "-0.02em",
};

const logoSubtextStyle = {
  fontSize: "0.95rem",
  color: "var(--gray-500)",
  marginTop: "6px",
};

const errorBoxStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  backgroundColor: "var(--danger-50)",
  color: "var(--danger-600)",
  padding: "12px 16px",
  borderRadius: "var(--radius-md)",
  marginBottom: "20px",
  fontSize: "0.88rem",
  fontWeight: 500,
  border: "1px solid var(--danger-100)",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const labelStyle = {
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "var(--gray-700)",
  marginBottom: "2px",
};

const submitButtonStyle = {
  width: "100%",
  padding: "13px 24px",
  background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-md)",
  fontSize: "0.95rem",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: "8px",
  boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
  transition: "all 0.2s",
};

const footerStyle = {
  textAlign: "center",
  marginTop: "28px",
  fontSize: "0.9rem",
};

const linkButtonStyle = {
  background: "none",
  color: "var(--primary-600)",
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.9rem",
  padding: 0,
};

export default LoginPage;
