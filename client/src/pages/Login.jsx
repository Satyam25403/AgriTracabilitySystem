import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "farmer" });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg-primary)", padding: "20px"
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ fontSize: "42px", marginBottom: "8px" }}>🌾</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "22px", color: "var(--forest)" }}>AgriTrace</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>Commodity Traceability System</p>
        </div>

        <div className="card">
          {/* Mode tabs */}
          <div style={{ display: "flex", gap: "0", marginBottom: "24px", background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", padding: "4px" }}>
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "8px", border: "none", cursor: "pointer",
                borderRadius: "var(--radius-sm)", fontFamily: "var(--font-body)",
                fontSize: "13px", fontWeight: 600, textTransform: "capitalize",
                background: mode === m ? "var(--forest)" : "transparent",
                color: mode === m ? "#d4e8c4" : "var(--text-muted)",
                transition: "all 0.15s",
              }}>{m}</button>
            ))}
          </div>

          {mode === "register" && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" placeholder="Your name" value={form.name} onChange={set("name")} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} />
          </div>

          {mode === "register" && (
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={form.role} onChange={set("role")}>
                <option value="farmer">Farmer</option>
                <option value="processor">Processor</option>
                <option value="warehouse">Warehouse</option>
                <option value="dispatcher">Dispatcher</option>
              </select>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "5px" }}>
                Admin accounts are created by your system administrator.
              </p>
            </div>
          )}

          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "8px" }} onClick={submit} disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "12px", marginTop: "20px" }}>
          AgriTrace v1.0 — Secure commodity tracking
        </p>
      </div>
    </div>
  );
}