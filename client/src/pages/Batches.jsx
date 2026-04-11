import { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import BatchTable from "../components/BatchTable";
import toast from "react-hot-toast";

const STATUS_ORDER = ["sourced","cleaning","grading","packaging","warehoused","shipped","delivered"];
const emptyForm = { commodityType: "", farmerName: "", farmLocation: "", harvestDate: "", quantity: "", unit: "kg", notes: "" };

export default function Batches() {
  const { can } = useAuth();
  const { socket } = useSocket();
  const [batches, setBatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQR, setShowQR] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/batches", { params });
      setBatches(res.data.batches);
      setTotal(res.data.total);
    } catch (e) { toast.error("Failed to load batches"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBatches(); }, [search, statusFilter]);

  useEffect(() => {
    if (socket) {
      socket.on("batch_created", fetchBatches);
      socket.on("batch_status_updated", fetchBatches);
      return () => {
        socket.off("batch_created", fetchBatches);
        socket.off("batch_status_updated", fetchBatches);
      };
    }
  }, [socket]);

  const submit = async () => {
    if (!form.commodityType || !form.farmerName || !form.farmLocation || !form.harvestDate || !form.quantity) {
      return toast.error("Please fill all required fields");
    }
    setSaving(true);
    try {
      await api.post("/batches", form);
      toast.success("Batch created!");
      setShowModal(false);
      setForm(emptyForm);
      fetchBatches();
    } catch (e) { toast.error(e.response?.data?.message || "Failed to create batch"); }
    finally { setSaving(false); }
  };

  const deleteBatch = async (id) => {
    if (!window.confirm("Delete this batch? This cannot be undone.")) return;
    try {
      await api.delete(`/batches/${id}`);
      toast.success("Batch deleted");
      fetchBatches();
    } catch (e) { toast.error("Failed to delete batch"); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Batch Management</h2>
          <p className="page-subtitle">{total} total batches in system</p>
        </div>
        {can("admin", "farmer") && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Batch</button>
        )}
      </div>

      {/* Filters */}
      <div className="search-bar">
        <input
          className="form-control"
          placeholder="Search batch ID, farmer, location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All Statuses</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Batch Table — using BatchTable component */}
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Batch</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Commodity Type *</label>
                <input className="form-control" placeholder="Rice, Wheat, Maize..." value={form.commodityType} onChange={set("commodityType")} />
              </div>
              <div className="form-group">
                <label className="form-label">Farmer Name *</label>
                <input className="form-control" placeholder="Farmer's full name" value={form.farmerName} onChange={set("farmerName")} />
              </div>
              <div className="form-group">
                <label className="form-label">Farm Location *</label>
                <input className="form-control" placeholder="Village, District, State" value={form.farmLocation} onChange={set("farmLocation")} />
              </div>
              <div className="form-group">
                <label className="form-label">Harvest Date *</label>
                <input className="form-control" type="date" value={form.harvestDate} onChange={set("harvestDate")} />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-control" type="number" placeholder="0" value={form.quantity} onChange={set("quantity")} />
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
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-control" placeholder="Optional notes..." value={form.notes} onChange={set("notes")} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>
                {saving ? "Creating..." : "Create Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(null)}>
          <div className="modal" style={{ maxWidth: 380, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">QR — {showQR.batchId}</h3>
              <button className="modal-close" onClick={() => setShowQR(null)}>×</button>
            </div>
            <img src={showQR.qrCodeUrl} alt="QR Code" style={{ width: "240px", borderRadius: "8px", margin: "0 auto 16px", display: "block" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>Scan to view full traceability journey</p>
            <p style={{ color: "var(--green-primary)", fontSize: "12px", fontFamily: "var(--font-mono)", marginTop: "8px" }}>{showQR.batchId}</p>
            <div className="modal-footer" style={{ justifyContent: "center" }}>
              <a href={showQR.qrCodeUrl} download={`${showQR.batchId}-qr.png`} className="btn btn-primary">Download QR</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}