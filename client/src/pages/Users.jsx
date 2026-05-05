import { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const ALL_ROLES = ["admin", "farmer", "processor", "warehouse", "dispatcher"];

const ROLE_META = {
  admin:      { label: "Admin",      bg: "#f5e8eb", color: "#7a1a2e", border: "#e0b8c0" },
  farmer:     { label: "Farmer",     bg: "#e8f5e8", color: "#1e5a1e", border: "#b8d8b8" },
  processor:  { label: "Processor",  bg: "#f7eddc", color: "#b5621e", border: "#e8d0b0" },
  warehouse:  { label: "Warehouse",  bg: "#e4eaf2", color: "#3a4a5c", border: "#c8d8e8" },
  dispatcher: { label: "Dispatcher", bg: "#ede8f5", color: "#5c3a8a", border: "#d0c0e8" },
};

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.farmer;
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: "3px",
      fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.07em",
      textTransform: "uppercase", background: m.bg, color: m.color,
      border: `1px solid ${m.border}`,
    }}>{m.label}</span>
  );
}

const emptyForm = { name: "", email: "", password: "", role: "farmer" };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(null); // { user, action }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));


  // Fetch users from the API and update state, showing a loading spinner while fetching and handling errors with a toast notification
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/auth/users");
      setUsers(res.data.users);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);


  // Handler for creating a new user, which validates the form, makes an API call to create the user, and then refreshes the user list. It also handles loading state and shows success/error toasts.
  const createUser = async () => {
    if (!form.name || !form.email || !form.password || !form.role) {
      return toast.error("All fields are required");
    }
    if (form.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    setSaving(true);
    try {
      await api.post("/auth/users", form);
      toast.success(`${form.role === "admin" ? "Admin" : form.role} account created for ${form.name}`);
      setShowCreate(false);
      setForm(emptyForm);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.patch(`/auth/users/${u._id}`, { isActive: !u.isActive });
      toast.success(u.isActive ? `${u.name} deactivated` : `${u.name} reactivated`);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    } finally {
      setShowConfirm(null);
    }
  };

  const changeRole = async (u, newRole) => {
    try {
      await api.patch(`/auth/users/${u._id}`, { role: newRole });
      toast.success(`${u.name} is now ${newRole}`);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to change role");
    }
  };

  // Counts
  const adminCount  = users.filter(u => u.role === "admin"  && u.isActive).length;
  const activeCount = users.filter(u => u.isActive).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">User Management</h2>
          <p className="page-subtitle">{activeCount} active user{activeCount !== 1 ? "s" : ""} · {adminCount} admin{adminCount !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
          + Create User
        </button>
      </div>

      {/* Role legend */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {ALL_ROLES.map(r => <RoleBadge key={r} role={r} />)}
        <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center", marginLeft: 4 }}>
          — only admins can create users or change roles
        </span>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-screen" style={{ minHeight: 180 }}><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u._id === me?._id || u.email === me?.email;
                  return (
                    <tr key={u._id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: ROLE_META[u.role]?.bg || "var(--forest-wash)",
                            color: ROLE_META[u.role]?.color || "var(--forest)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "11px", fontWeight: 700,
                            border: `1px solid ${ROLE_META[u.role]?.border || "var(--border)"}`,
                            flexShrink: 0,
                          }}>
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {u.name}
                            {isMe && (
                              <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: 6, fontWeight: 400 }}>you</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "13px" }}>{u.email}</td>
                      <td>
                        {isMe ? (
                          <RoleBadge role={u.role} />
                        ) : (
                          /* Inline role change dropdown */
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u, e.target.value)}
                            style={{
                              background: ROLE_META[u.role]?.bg || "var(--bg-card)",
                              color:      ROLE_META[u.role]?.color || "var(--text-primary)",
                              border:     `1px solid ${ROLE_META[u.role]?.border || "var(--border)"}`,
                              borderRadius: "3px",
                              fontSize: "10.5px", fontWeight: 700,
                              padding: "2px 6px",
                              textTransform: "uppercase",
                              letterSpacing: "0.07em",
                              cursor: "pointer",
                              fontFamily: "var(--font-body)",
                            }}
                          >
                            {ALL_ROLES.map(r => (
                              <option key={r} value={r} style={{ background: "var(--bg-input)", color: "var(--text-primary)", textTransform: "capitalize", fontWeight: 400 }}>
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: "3px",
                          fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          background: u.isActive ? "#e8f5e8" : "#f5f0ec",
                          color:      u.isActive ? "#1e5a1e"  : "#8a7060",
                          border:     `1px solid ${u.isActive ? "#b8d8b8" : "#d8ccc4"}`,
                        }}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        {!isMe && (
                          <button
                            className={`btn btn-sm ${u.isActive ? "btn-danger" : "btn-secondary"}`}
                            onClick={() => setShowConfirm({ user: u, action: u.isActive ? "deactivate" : "reactivate" })}
                          >
                            {u.isActive ? "Deactivate" : "Reactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create User Account</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-control" placeholder="User's full name" value={form.name} onChange={set("name")} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-control" type="email" placeholder="user@example.com" value={form.email} onChange={set("email")} />
            </div>
            <div className="form-group">
              <label className="form-label">Temporary Password *</label>
              <input className="form-control" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set("password")} />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-control" value={form.role} onChange={set("role")}>
                {ALL_ROLES.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Highlight when admin is selected */}
            {form.role === "admin" && (
              <div style={{
                padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 16,
                background: "var(--burgundy-light)", border: "1px solid #e0b8c0",
                fontSize: "13px", color: "var(--burgundy)",
              }}>
                ⚠ This account will have full admin access — create batches, manage all users, delete records.
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createUser} disabled={saving}>
                {saving ? "Creating..." : `Create ${form.role === "admin" ? "Admin" : form.role} Account`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm deactivate/reactivate */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {showConfirm.action === "deactivate" ? "Deactivate Account" : "Reactivate Account"}
              </h3>
              <button className="modal-close" onClick={() => setShowConfirm(null)}>×</button>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
              {showConfirm.action === "deactivate"
                ? <>Are you sure you want to deactivate <strong>{showConfirm.user.name}</strong>? They will not be able to log in until reactivated.</>
                : <>Reactivate <strong>{showConfirm.user.name}</strong>? They will be able to log in again.</>
              }
            </p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowConfirm(null)}>Cancel</button>
              <button
                className={`btn ${showConfirm.action === "deactivate" ? "btn-danger" : "btn-primary"}`}
                onClick={() => toggleActive(showConfirm.user)}
              >
                {showConfirm.action === "deactivate" ? "Yes, Deactivate" : "Yes, Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}