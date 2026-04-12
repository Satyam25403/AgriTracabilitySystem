import { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import toast from "react-hot-toast";

const COUNTRIES = ["India","Vietnam","Sri Lanka","Brazil","China","Mexico","Spain","Indonesia","Thailand","Other"];
const CERTIFICATIONS = ["ISO 22000","HACCP","BRC","FDA (FSMA)","FSSAI","GAP","SMETA","SEDEX","Organic","Fairtrade"];
const COMMODITIES = ["Chilli","Black Pepper","Turmeric","Paprika","Ginger","Cumin","Coriander","Cardamom","Himalayan Salt","Cotton","Rice","Wheat","Maize","Soybean","Other"];

const emptyForm = {
  name: "", type: "farmer_group", country: "", region: "",
  contactName: "", contactEmail: "", contactPhone: "",
  certifications: [], commodities: [], farmerCount: "", notes: "",
};

function VerificationBadge({ status }) {
  const map = {
    verified:  { bg: "#e8f5e8", color: "#1e5a1e", border: "#b8d8b8", label: "Verified" },
    pending:   { bg: "#f7eddc", color: "#b5621e", border: "#e8d0b0", label: "Pending" },
    suspended: { bg: "#f5e8eb", color: "#7a1a2e", border: "#e0b8c0", label: "Suspended" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: "3px",
      fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.07em",
      textTransform: "uppercase", border: `1px solid ${s.border}`,
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

export default function Suppliers() {
  const { can } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats]         = useState(null);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // supplier being edited
  const [showDetail, setShowDetail] = useState(null);
  const [detailBatches, setDetailBatches] = useState([]);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [statusFilter, setStatusFilter]   = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleCert = (cert) => setForm((f) => ({
    ...f,
    certifications: f.certifications.includes(cert)
      ? f.certifications.filter((c) => c !== cert)
      : [...f.certifications, cert],
  }));

  const toggleCommodity = (c) => setForm((f) => ({
    ...f,
    commodities: f.commodities.includes(c)
      ? f.commodities.filter((x) => x !== c)
      : [...f.commodities, c],
  }));

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)        params.search  = search;
      if (countryFilter) params.country = countryFilter;
      if (statusFilter)  params.status  = statusFilter;
      const [sRes, stRes] = await Promise.all([
        api.get("/suppliers", { params }),
        api.get("/suppliers/stats"),
      ]);
      setSuppliers(sRes.data.suppliers);
      setTotal(sRes.data.total);
      setStats(stRes.data.stats);
    } catch { toast.error("Failed to load suppliers"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSuppliers(); }, [search, countryFilter, statusFilter]);

  const openCreate = () => { setForm(emptyForm); setEditTarget(null); setShowModal(true); };
  const openEdit   = (s) => {
    setForm({
      name: s.name, type: s.type, country: s.country, region: s.region || "",
      contactName: s.contactName || "", contactEmail: s.contactEmail || "",
      contactPhone: s.contactPhone || "",
      certifications: s.certifications || [],
      commodities:    s.commodities    || [],
      farmerCount: s.farmerCount || "",
      notes: s.notes || "",
    });
    setEditTarget(s);
    setShowModal(true);
  };

  const openDetail = async (s) => {
    setShowDetail(s);
    try {
      const r = await api.get(`/suppliers/${s._id}/batches`);
      setDetailBatches(r.data.batches);
    } catch { setDetailBatches([]); }
  };

  const submit = async () => {
    if (!form.name || !form.country) return toast.error("Name and country are required");
    setSaving(true);
    try {
      const payload = { ...form, farmerCount: Number(form.farmerCount) || 0 };
      if (editTarget) {
        await api.put(`/suppliers/${editTarget._id}`, payload);
        toast.success("Supplier updated");
      } else {
        await api.post("/suppliers", payload);
        toast.success("Supplier created");
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, verificationStatus) => {
    try {
      await api.put(`/suppliers/${id}`, { verificationStatus });
      toast.success("Status updated");
      fetchSuppliers();
      if (showDetail?._id === id) setShowDetail((s) => ({ ...s, verificationStatus }));
    } catch { toast.error("Failed to update status"); }
  };

  const deleteSupplier = async (id) => {
    if (!window.confirm("Deactivate this supplier?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success("Supplier deactivated");
      setShowDetail(null);
      fetchSuppliers();
    } catch { toast.error("Failed"); }
  };

  // Unique countries from loaded data for filter dropdown
  const countries = [...new Set(suppliers.map((s) => s.country))].sort();

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Suppliers & Farmer Groups</h2>
          <p className="page-subtitle">{total} active supplier{total !== 1 ? "s" : ""} across {stats?.byCountry?.length || 0} countries</p>
        </div>
        {can("admin", "farmer") && (
          <button className="btn btn-primary" onClick={openCreate}>+ Add Supplier</button>
        )}
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Total Suppliers</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-icon">🤝</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Verified</div>
            <div className="stat-value">{stats.verified}</div>
            <div className="stat-icon">✓</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">Countries</div>
            <div className="stat-value">{stats.byCountry?.length || 0}</div>
            <div className="stat-icon">🌍</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-label">Pending Review</div>
            <div className="stat-value">{stats.total - stats.verified}</div>
            <div className="stat-icon">⏳</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="search-bar">
        <input
          className="form-control"
          placeholder="Search name, region, commodity..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <select className="form-control" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All Countries</option>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤝</div>
            <p>No suppliers found. Add your first farmer group or processor.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Type</th><th>Country</th><th>Region</th>
                  <th>Farmers</th><th>Certifications</th><th>Commodities</th>
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <button
                        onClick={() => openDetail(s)}
                        style={{ background: "none", border: "none", cursor: "pointer",
                          fontWeight: 600, color: "var(--forest)", fontSize: "13.5px",
                          fontFamily: "var(--font-serif)", textAlign: "left", padding: 0 }}
                      >{s.name}</button>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12px", textTransform: "capitalize" }}>
                      {s.type.replace("_", " ")}
                    </td>
                    <td>{s.country}</td>
                    <td style={{ color: "var(--text-muted)" }}>{s.region || "—"}</td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {s.farmerCount > 0 ? s.farmerCount.toLocaleString() : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(s.certifications || []).slice(0, 3).map((c) => (
                          <span key={c} style={{
                            fontSize: "10px", padding: "1px 6px", borderRadius: "2px",
                            background: "var(--forest-wash)", color: "var(--forest)", border: "1px solid var(--forest-pale)",
                            fontWeight: 600, letterSpacing: "0.05em",
                          }}>{c}</span>
                        ))}
                        {(s.certifications || []).length > 3 && (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>+{s.certifications.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {(s.commodities || []).slice(0, 2).map((c) => (
                          <span key={c} style={{ fontSize: "11px", color: "var(--text-muted)" }}>{c}{" "}</span>
                        ))}
                        {(s.commodities || []).length > 2 && (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>+{s.commodities.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td><VerificationBadge status={s.verificationStatus} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openDetail(s)}>View</button>
                        {can("admin", "farmer") && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editTarget ? "Edit Supplier" : "Add Supplier"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            {/* Basic info */}
            <div className="grid-2">
              <div className="form-group" style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Supplier / Group Name *</label>
                <input className="form-control" placeholder="e.g. Ravi Kumar Farmer Group" value={form.name} onChange={set("name")} />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-control" value={form.type} onChange={set("type")}>
                  <option value="farmer_group">Farmer Group</option>
                  <option value="processor">Processor</option>
                  <option value="cooperative">Cooperative</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Country *</label>
                <select className="form-control" value={form.country} onChange={set("country")}>
                  <option value="">— Select —</option>
                  {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Region / State</label>
                <input className="form-control" placeholder="e.g. Kerala, Maharashtra" value={form.region} onChange={set("region")} />
              </div>
              <div className="form-group">
                <label className="form-label">Number of Farmers</label>
                <input className="form-control" type="number" placeholder="0" value={form.farmerCount} onChange={set("farmerCount")} />
              </div>
            </div>

            {/* Contact */}
            <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.09em", textTransform: "uppercase", margin: "12px 0 10px" }}>Contact Details</p>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input className="form-control" value={form.contactName} onChange={set("contactName")} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input className="form-control" value={form.contactPhone} onChange={set("contactPhone")} />
              </div>
              <div className="form-group" style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Contact Email</label>
                <input className="form-control" type="email" value={form.contactEmail} onChange={set("contactEmail")} />
              </div>
            </div>

            {/* Certifications */}
            <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.09em", textTransform: "uppercase", margin: "12px 0 10px" }}>Certifications</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {CERTIFICATIONS.map((cert) => (
                <button key={cert} type="button" onClick={() => toggleCert(cert)} style={{
                  padding: "4px 11px", borderRadius: "3px", fontSize: "12px",
                  fontWeight: 600, cursor: "pointer", border: "1px solid",
                  background: form.certifications.includes(cert) ? "var(--forest)" : "var(--bg-card)",
                  color:      form.certifications.includes(cert) ? "#d4e8c4"       : "var(--text-secondary)",
                  borderColor:form.certifications.includes(cert) ? "var(--forest)" : "var(--border)",
                  transition: "all 0.15s",
                }}>{cert}</button>
              ))}
            </div>

            {/* Commodities */}
            <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.09em", textTransform: "uppercase", margin: "0 0 10px" }}>Commodities Supplied</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {COMMODITIES.map((c) => (
                <button key={c} type="button" onClick={() => toggleCommodity(c)} style={{
                  padding: "4px 11px", borderRadius: "3px", fontSize: "12px",
                  fontWeight: 600, cursor: "pointer", border: "1px solid",
                  background: form.commodities.includes(c) ? "var(--amber-warm)" : "var(--bg-card)",
                  color:      form.commodities.includes(c) ? "white"             : "var(--text-secondary)",
                  borderColor:form.commodities.includes(c) ? "var(--amber-warm)" : "var(--border)",
                  transition: "all 0.15s",
                }}>{c}</button>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-control" placeholder="Additional information..." value={form.notes} onChange={set("notes")} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>
                {saving ? "Saving..." : editTarget ? "Save Changes" : "Create Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{showDetail.name}</h3>
              <button className="modal-close" onClick={() => setShowDetail(null)}>×</button>
            </div>

            {/* Identity row */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <VerificationBadge status={showDetail.verificationStatus} />
              <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "capitalize" }}>
                {showDetail.type?.replace("_", " ")}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {showDetail.country}{showDetail.region ? `, ${showDetail.region}` : ""}
              </span>
              {showDetail.farmerCount > 0 && (
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {showDetail.farmerCount.toLocaleString()} farmers
                </span>
              )}
            </div>

            {/* Contact */}
            {(showDetail.contactName || showDetail.contactEmail || showDetail.contactPhone) && (
              <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 14 }}>
                {showDetail.contactName  && <div style={{ fontSize: "13px" }}><strong>Contact:</strong> {showDetail.contactName}</div>}
                {showDetail.contactPhone && <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{showDetail.contactPhone}</div>}
                {showDetail.contactEmail && <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{showDetail.contactEmail}</div>}
              </div>
            )}

            {/* Certs */}
            {(showDetail.certifications || []).length > 0 && (
              <>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 8 }}>Certifications</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {showDetail.certifications.map((c) => (
                    <span key={c} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "3px", background: "var(--forest-wash)", color: "var(--forest)", border: "1px solid var(--forest-pale)", fontWeight: 600 }}>{c}</span>
                  ))}
                </div>
              </>
            )}

            {/* Commodities */}
            {(showDetail.commodities || []).length > 0 && (
              <>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 8 }}>Commodities</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {showDetail.commodities.map((c) => (
                    <span key={c} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "3px", background: "var(--amber-light)", color: "var(--amber-warm)", border: "1px solid #e8d0b0", fontWeight: 600 }}>{c}</span>
                  ))}
                </div>
              </>
            )}

            {/* Notes */}
            {showDetail.notes && (
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: 14, padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--border)" }}>
                {showDetail.notes}
              </p>
            )}

            {/* Linked batches */}
            {detailBatches.length > 0 && (
              <>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 8 }}>Linked Batches ({detailBatches.length})</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto", marginBottom: 14 }}>
                  {detailBatches.map((b) => (
                    <div key={b._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                      <span style={{ fontFamily: "var(--font-serif)", fontSize: "12px", fontWeight: 700, color: "var(--forest)" }}>{b.batchId}</span>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{b.commodityType}</span>
                      <StatusBadge status={b.currentStatus} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Status actions + Edit */}
            {can("admin", "farmer") && (
              <div className="modal-footer" style={{ flexWrap: "wrap" }}>
                {showDetail.verificationStatus !== "verified" && (
                  <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(showDetail._id, "verified")}>✓ Mark Verified</button>
                )}
                {showDetail.verificationStatus !== "pending" && (
                  <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(showDetail._id, "pending")}>Set Pending</button>
                )}
                {showDetail.verificationStatus !== "suspended" && (
                  <button className="btn btn-danger btn-sm" onClick={() => updateStatus(showDetail._id, "suspended")}>Suspend</button>
                )}
                <div style={{ flex: 1 }} />
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowDetail(null); openEdit(showDetail); }}>Edit</button>
                {can("admin") && (
                  <button className="btn btn-danger btn-sm" onClick={() => deleteSupplier(showDetail._id)}>Deactivate</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}