import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        address: formData.address,
      });
      alert("Registration successful! Please login with your credentials.");
      navigate("/login");
    } catch (err) {
      setError(err.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={bgDecoration1Style} />
      <div style={bgDecoration2Style} />

      <div style={containerStyle} className="animate-scale-in">
        <div style={logoContainerStyle}>
          <div style={logoIconStyle}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 style={logoTextStyle}>Virtual House Renting</h1>
          <p style={logoSubtextStyle}>Create your account to find your perfect home</p>
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

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={rowStyle}>
            <div className="input-group">
              <label style={labelStyle}>First Name</label>
              <input type="text" name="firstName" placeholder="First name" value={formData.firstName} onChange={handleChange} className="input-field" required />
            </div>
            <div className="input-group">
              <label style={labelStyle}>Last Name</label>
              <input type="text" name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleChange} className="input-field" required />
            </div>
          </div>

          <div className="input-group">
            <label style={labelStyle}>Username</label>
            <input type="text" name="username" placeholder="Choose a username" value={formData.username} onChange={handleChange} className="input-field" required />
          </div>

          <div className="input-group">
            <label style={labelStyle}>Email</label>
            <input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} className="input-field" required />
          </div>

          <div style={rowStyle}>
            <div className="input-group">
              <label style={labelStyle}>Password</label>
              <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="input-field" required />
            </div>
            <div className="input-group">
              <label style={labelStyle}>Confirm Password</label>
              <input type="password" name="confirmPassword" placeholder="Confirm password" value={formData.confirmPassword} onChange={handleChange} className="input-field" required />
            </div>
          </div>

          <div className="input-group">
            <label style={labelStyle}>Phone <span style={{ fontWeight: 400, color: "var(--gray-400)" }}>(optional)</span></label>
            <input type="tel" name="phone" placeholder="+1234567890" value={formData.phone} onChange={handleChange} className="input-field" />
          </div>

          <div className="input-group">
            <label style={labelStyle}>Address <span style={{ fontWeight: 400, color: "var(--gray-400)" }}>(optional)</span></label>
            <textarea name="address" placeholder="Your address" value={formData.address} onChange={handleChange} rows="2" className="input-field" />
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
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div style={footerStyle}>
          <span style={{ color: "var(--gray-500)" }}>Already have an account? </span>
          <button onClick={() => navigate("/login")} style={linkButtonStyle}>
            Sign in
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
  position: "absolute", top: "-20%", right: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", pointerEvents: "none",
};

const bgDecoration2Style = {
  position: "absolute", bottom: "-20%", left: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", pointerEvents: "none",
};

const containerStyle = {
  width: "100%", maxWidth: "520px", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderRadius: "var(--radius-2xl)", padding: "40px 36px", boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.6)", position: "relative", zIndex: 1,
};

const logoContainerStyle = { textAlign: "center", marginBottom: "28px" };
const logoIconStyle = { width: "56px", height: "56px", borderRadius: "var(--radius-lg)", background: "linear-gradient(135deg, var(--primary-500), var(--accent-500))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 24px rgba(59,130,246,0.3)" };
const logoTextStyle = { fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 800, color: "var(--gray-900)", margin: 0, letterSpacing: "-0.02em" };
const logoSubtextStyle = { fontSize: "0.9rem", color: "var(--gray-500)", marginTop: "6px" };
const errorBoxStyle = { display: "flex", alignItems: "center", gap: "10px", backgroundColor: "var(--danger-50)", color: "var(--danger-600)", padding: "12px 16px", borderRadius: "var(--radius-md)", marginBottom: "16px", fontSize: "0.85rem", fontWeight: 500, border: "1px solid var(--danger-100)" };
const formStyle = { display: "flex", flexDirection: "column", gap: "16px" };
const rowStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" };
const labelStyle = { fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)" };
const submitButtonStyle = { width: "100%", padding: "13px 24px", background: "linear-gradient(135deg, var(--success-600), var(--success-700))", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", marginTop: "6px", boxShadow: "0 4px 12px rgba(22,163,74,0.3)", transition: "all 0.2s" };
const footerStyle = { textAlign: "center", marginTop: "24px", fontSize: "0.9rem" };
const linkButtonStyle = { background: "none", color: "var(--primary-600)", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", padding: 0 };

export default RegisterPage;
