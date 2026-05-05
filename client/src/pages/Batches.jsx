import { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import BatchTable from "../components/BatchTable";
import toast from "react-hot-toast";

const COUNTRIES = ["India","Vietnam","Sri Lanka","Brazil","China","Mexico","Spain","Indonesia","Thailand","Other"];
const STATUS_ORDER = ["sourced","cleaning","grading","packaging","warehoused","shipped","delivered"];
const emptyForm = {
  commodityType: "", unit: "kg", notes: "",
  // single-origin
  farmerName: "", farmLocation: "", harvestDate: "", quantity: "",
  // multi-origin mode flag
  isMultiOrigin: false,
  origins: [],
};
const emptyOrigin = { country: "", region: "", farmerGroup: "", supplier: "", quantity: "", unit: "kg", harvestDate: "", notes: "" };

export default function Batches() {
  const { can }    = useAuth();
  const { socket } = useSocket();
  const [batches, setBatches]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQR, setShowQR]     = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Origin row helpers
  const addOrigin = () => setForm((f) => ({ ...f, origins: [...f.origins, { ...emptyOrigin }] }));
  const removeOrigin = (i) => setForm((f) => ({ ...f, origins: f.origins.filter((_, idx) => idx !== i) }));
  const setOrigin = (i, k) => (e) => setForm((f) => {
    const origins = [...f.origins];
    origins[i] = { ...origins[i], [k]: e.target.value };
    return { ...f, origins };
  });

  // Toggle between single-origin and multi-origin mode, resetting fields as needed
  const toggleMultiOrigin = () => {
    setForm((f) => ({
      ...f,
      isMultiOrigin: !f.isMultiOrigin,
      origins: !f.isMultiOrigin && f.origins.length === 0 ? [{ ...emptyOrigin }] : f.origins,
    }));
  };

  // Fetch batches from the server with optional search and filters, and set up socket listeners for real-time updates
  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)       params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (originFilter) params.origin = originFilter;
      const res = await api.get("/batches", { params });
      setBatches(res.data.batches);
      setTotal(res.data.total);
    } catch { toast.error("Failed to load batches"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBatches(); }, [search, statusFilter, originFilter]);
  useEffect(() => {
    api.get("/suppliers").then((r) => setSuppliers(r.data.suppliers || [])).catch(() => {});
  }, []);
  // Set up socket listeners for real-time batch updates (new batches, status changes) and refresh the list when they occur
  useEffect(() => {
    if (socket) {
      socket.on("batch_created",        fetchBatches);
      socket.on("batch_status_updated", fetchBatches);
      return () => {
        socket.off("batch_created",        fetchBatches);
        socket.off("batch_status_updated", fetchBatches);
      };
    }
  }, [socket]);


  // Submit the create batch form, with validation for required fields and different logic for single-origin vs multi-origin batches. On success, close the modal and refresh the batch list.
  const submit = async () => {
    if (!form.commodityType) return toast.error("Commodity type is required");
    if (!form.isMultiOrigin && (!form.farmerName || !form.farmLocation || !form.harvestDate || !form.quantity)) {
      return toast.error("Fill all required single-origin fields");
    }
    if (form.isMultiOrigin) {
      if (form.origins.length === 0) return toast.error("Add at least one origin");
      const totalQty = form.origins.reduce((s, o) => s + (Number(o.quantity) || 0), 0);
      if (totalQty === 0) return toast.error("Origins must have quantity");
    }
    setSaving(true);
    try {
      const payload = form.isMultiOrigin
        ? {
            commodityType: form.commodityType,
            unit: form.unit, notes: form.notes,
            quantity: form.origins.reduce((s, o) => s + (Number(o.quantity) || 0), 0),
            origins: form.origins.map((o) => ({
              ...o,
              quantity: Number(o.quantity),
              supplier: o.supplier || undefined,
            })),
          }
        : {
            commodityType: form.commodityType,
            farmerName:    form.farmerName,
            farmLocation:  form.farmLocation,
            harvestDate:   form.harvestDate,
            quantity:      Number(form.quantity),
            unit:          form.unit,
            notes:         form.notes,
          };

      await api.post("/batches", payload);
      toast.success("Batch created!");
      setShowModal(false);
      setForm(emptyForm);
      fetchBatches();
    } catch (e) { toast.error(e.response?.data?.message || "Failed to create batch"); }
    finally { setSaving(false); }
  };

  
  // Delete a batch by ID after confirming with the user, then refresh the batch list on success
  const deleteBatch = async (id) => {
    if (!window.confirm("Delete this batch? This cannot be undone.")) return;
    try {
      await api.delete(`/batches/${id}`);
      toast.success("Batch deleted");
      fetchBatches();
    } catch { toast.error("Failed to delete batch"); }
  };

  // Compute total qty for multi-origin live display
  const multiOriginTotal = form.origins.reduce((s, o) => s + (Number(o.quantity) || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Batch Management</h2>
          <p className="page-subtitle">{total} total batches in system</p>
        </div>
        {can("admin", "farmer") && (
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setShowModal(true); }}>+ New Batch</button>
        )}
      </div>

      {/* Filters */}
      <div className="search-bar">
        <input
          className="form-control"
          placeholder="Search batch ID, farmer, location..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All Statuses</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-control" value={originFilter} onChange={(e) => setOriginFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Origins</option>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : (
          <BatchTable
            batches={batches}
            onQR={(b) => setShowQR(b)}
            onDelete={deleteBatch}
            showActions={true}
            canDelete={can("admin")}
          />
        )}
      </div>

      {/* Create Batch Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Batch</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            {/* Top fields */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Commodity Type *</label>
                <input className="form-control" placeholder="Rice, Wheat, Chilli..." value={form.commodityType} onChange={set("commodityType")} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-control" value={form.unit} onChange={set("unit")}>
                  <option value="kg">kg</option>
                  <option value="tonnes">Tonnes</option>
                  <option value="quintal">Quintal</option>
                  <option value="bags">Bags</option>
                </select>
              </div>
            </div>

            {/* Multi-origin toggle */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px", background: "var(--bg-secondary)",
              border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              marginBottom: 18,
            }}>
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Multi-Origin Consolidation
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: 2 }}>
                  Enable if this batch consolidates from multiple countries or farm groups
                </div>
              </div>
              <button
                type="button"
                onClick={toggleMultiOrigin}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: form.isMultiOrigin ? "var(--forest)" : "var(--border)",
                  border: "none", cursor: "pointer", position: "relative",
                  transition: "background 0.2s", flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", top: 3, width: 18, height: 18,
                  borderRadius: "50%", background: "white",
                  left: form.isMultiOrigin ? 23 : 3,
                  transition: "left 0.2s",
                }} />
              </button>
            </div>

            {/* ── Single-origin fields ── */}
            {!form.isMultiOrigin && (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Farmer Name *</label>
                  <input className="form-control" placeholder="Farmer's full name" value={form.farmerName} onChange={set("farmerName")} />
                </div>
                <div className="form-group">
                  <label className="form-label">Farm Location *</label>
                  <input className="form-control" placeholder="Village, District, Country" value={form.farmLocation} onChange={set("farmLocation")} />
                </div>
                <div className="form-group">
                  <label className="form-label">Harvest Date *</label>
                  <input className="form-control" type="date" value={form.harvestDate} onChange={set("harvestDate")} />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input className="form-control" type="number" placeholder="0" value={form.quantity} onChange={set("quantity")} />
                </div>
              </div>
            )}

            {/* ── Multi-origin origin rows ── */}
            {form.isMultiOrigin && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.09em" }}>
                    Origins ({form.origins.length}) — Total: {multiOriginTotal.toLocaleString()} {form.unit}
                  </p>
                  <button className="btn btn-secondary btn-sm" onClick={addOrigin}>+ Add Origin</button>
                </div>

                {form.origins.map((origin, i) => (
                  <div key={i} style={{
                    background: "var(--bg-secondary)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)", padding: "14px", marginBottom: 10,
                    position: "relative",
                  }}>
                    <div style={{ position: "absolute", top: 8, right: 10 }}>
                      <button
                        type="button"
                        onClick={() => removeOrigin(i)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}
                      >×</button>
                    </div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: "12px", fontWeight: 600, color: "var(--forest)", marginBottom: 10 }}>
                      Origin {i + 1}
                    </div>
                    <div className="grid-2">
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label className="form-label">Country *</label>
                        <select className="form-control" value={origin.country} onChange={setOrigin(i, "country")}>
                          <option value="">— Select —</option>
                          {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label className="form-label">Region / State</label>
                        <input className="form-control" placeholder="e.g. Kerala" value={origin.region} onChange={setOrigin(i, "region")} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label className="form-label">Farmer Group</label>
                        <input className="form-control" placeholder="Group or farm name" value={origin.farmerGroup} onChange={setOrigin(i, "farmerGroup")} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label className="form-label">Linked Supplier</label>
                        <select className="form-control" value={origin.supplier} onChange={setOrigin(i, "supplier")}>
                          <option value="">— None —</option>
                          {suppliers.map((s) => (
                            <option key={s._id} value={s._id}>{s.name} ({s.country})</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label className="form-label">Quantity *</label>
                        <input className="form-control" type="number" placeholder="0" value={origin.quantity} onChange={setOrigin(i, "quantity")} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label className="form-label">Harvest Date</label>
                        <input className="form-control" type="date" value={origin.harvestDate} onChange={setOrigin(i, "harvestDate")} />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Notes</label>
                      <input className="form-control" placeholder="Quality notes, grade..." value={origin.notes} onChange={setOrigin(i, "notes")} />
                    </div>
                  </div>
                ))}

                {form.origins.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "13px" }}>
                    Click "+ Add Origin" to add your first origin country
                  </div>
                )}
              </div>
            )}

            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">Notes</label>
              <input className="form-control" placeholder="Optional batch notes..." value={form.notes} onChange={set("notes")} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>
                {saving ? "Creating..." : form.isMultiOrigin ? `Create Multi-Origin Batch (${multiOriginTotal} ${form.unit})` : "Create Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(null)}>
          <div className="modal" style={{ maxWidth: 380, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">QR — {showQR.batchId}</h3>
              <button className="modal-close" onClick={() => setShowQR(null)}>×</button>
            </div>
            {showQR.isMultiOrigin && (
              <div style={{ background: "var(--forest-wash)", border: "1px solid var(--forest-pale)", borderRadius: "var(--radius-sm)", padding: "8px 12px", marginBottom: 14, fontSize: "12px", color: "var(--forest)" }}>
                Multi-Origin Batch — {showQR.origins?.length || 0} origins
              </div>
            )}
            <img src={showQR.qrCodeUrl} alt="QR Code" style={{ width: "220px", borderRadius: "6px", margin: "0 auto 14px", display: "block", border: "1px solid var(--border)" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>Scan to view full traceability journey</p>
            <p style={{ color: "var(--forest)", fontSize: "12px", fontFamily: "var(--font-serif)", fontWeight: 700, marginTop: 6 }}>{showQR.batchId}</p>
            <div className="modal-footer" style={{ justifyContent: "center" }}>
              <a href={showQR.qrCodeUrl} download={`${showQR.batchId}-qr.png`} className="btn btn-primary">Download QR</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}