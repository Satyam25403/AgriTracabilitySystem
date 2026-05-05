import { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import StatusBadge from "../components/StatusBadge";
import toast from "react-hot-toast";

const emptyForm = { batchId: "", destination: "", dispatchDate: "", expectedDelivery: "", quantityShipped: "", unit: "kg", transportMode: "road", vehicleNumber: "", driverName: "" };

export default function Shipments() {
  const { can } = useAuth();
  const { socket } = useSocket();
  const [shipments, setShipments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [statusNote, setStatusNote] = useState({ status: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // Fetch shipments and batches, with optional status filter, and set up socket listeners for real-time updates
  const fetch = async () => {
    setLoading(true);
    try {
      const [sh, ba] = await Promise.all([
        api.get("/shipments", { params: statusFilter ? { status: statusFilter } : {} }),
        api.get("/batches"),
      ]);
      setShipments(sh.data.shipments);
      setBatches(ba.data.batches.filter(b => ["warehoused", "packaging"].includes(b.currentStatus)));
    } catch (e) { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [statusFilter]);
  useEffect(() => {
    if (socket) {
      socket.on("shipment_dispatched", fetch);
      socket.on("shipment_status_updated", fetch);
      return () => { socket.off("shipment_dispatched", fetch); socket.off("shipment_status_updated", fetch); };
    }
  }, [socket]);

  // Handler for creating a new shipment, with form validation and API call
  const submit = async () => {
    if (!form.batchId || !form.destination || !form.dispatchDate || !form.expectedDelivery || !form.quantityShipped)
      return toast.error("Fill all required fields");
    setSaving(true);
    try {
      await api.post("/shipments", { ...form, quantityShipped: Number(form.quantityShipped) });
      toast.success("Shipment created!");
      setShowModal(false);
      setForm(emptyForm);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  // Handler for updating shipment status with an optional note, making an API call to update and then refreshing the data
  const updateStatus = async (id) => {
    if (!statusNote.status) return toast.error("Select a status");
    setSaving(true);
    try {
      await api.put(`/shipments/${id}/status`, statusNote);
      toast.success("Status updated");
      setShowDetail(null);
      setStatusNote({ status: "", note: "" });
      fetch();
    } catch (e) { toast.error("Failed to update status"); }
    finally { setSaving(false); }
  };

  const isOverdue = (s) => new Date(s.expectedDelivery) < new Date() && !["delivered","cancelled"].includes(s.deliveryStatus);

  return (
    // Main page layout for managing shipments, including header, search/filter bar, and table of shipments with modals for creating and updating shipments
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Shipments</h2>
          <p className="page-subtitle">Track dispatch and delivery status</p>
        </div>
        {can("admin", "dispatcher") && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Shipment</button>
        )}
      </div>

      <div className="search-bar">
        <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">All Statuses</option>
          {["pending","in_transit","delivered","delayed","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

{/* // Shipment Table with conditional rendering for loading state, empty state, and list of shipments, including details and status badges */}
      <div className="card">
        {loading ? <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
        : shipments.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">▷</div><p>No shipments found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Shipment ID</th><th>Batch</th><th>Destination</th><th>Qty</th><th>Transport</th><th>Dispatch</th><th>Expected</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {shipments.map(s => (
                  <tr key={s._id} style={{ opacity: s.deliveryStatus === "cancelled" ? 0.5 : 1 }}>
                    <td><span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--amber)" }}>{s.shipmentId}</span></td>
                    <td><span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--green-primary)" }}>{s.batchId?.batchId}</span></td>
                    <td style={{ color: "var(--text-primary)" }}>{s.destination}</td>
                    <td>{s.quantityShipped} {s.unit}</td>
                    <td>{s.transportMode}</td>
                    <td>{new Date(s.dispatchDate).toLocaleDateString()}</td>
                    <td style={{ color: isOverdue(s) ? "var(--red)" : "inherit" }}>{new Date(s.expectedDelivery).toLocaleDateString()}{isOverdue(s) && " ⚠"}</td>
                    <td><StatusBadge status={s.deliveryStatus} /></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setShowDetail(s); setStatusNote({ status: s.deliveryStatus, note: "" }); }}>
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Shipment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Shipment</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Batch *</label>
              <select className="form-control" value={form.batchId} onChange={set("batchId")}>
                <option value="">-- Select batch --</option>
                {batches.map(b => <option key={b._id} value={b._id}>{b.batchId} — {b.commodityType} ({b.quantity} {b.unit})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Destination *</label>
              <input className="form-control" placeholder="City, Country or Export destination" value={form.destination} onChange={set("destination")} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Dispatch Date *</label>
                <input className="form-control" type="date" value={form.dispatchDate} onChange={set("dispatchDate")} />
              </div>
              <div className="form-group">
                <label className="form-label">Expected Delivery *</label>
                <input className="form-control" type="date" value={form.expectedDelivery} onChange={set("expectedDelivery")} />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity Shipped *</label>
                <input className="form-control" type="number" value={form.quantityShipped} onChange={set("quantityShipped")} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-control" value={form.unit} onChange={set("unit")}>
                  <option value="kg">kg</option><option value="tonnes">Tonnes</option><option value="quintal">Quintal</option><option value="bags">Bags</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Transport Mode</label>
                <select className="form-control" value={form.transportMode} onChange={set("transportMode")}>
                  <option value="road">Road</option><option value="rail">Rail</option><option value="air">Air</option><option value="sea">Sea</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle Number</label>
                <input className="form-control" placeholder="MH12AB1234" value={form.vehicleNumber} onChange={set("vehicleNumber")} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Driver Name</label>
              <input className="form-control" placeholder="Driver's name" value={form.driverName} onChange={set("driverName")} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Creating..." : "Create Shipment"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail + Status Update Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{showDetail.shipmentId}</h3>
              <button className="modal-close" onClick={() => setShowDetail(null)}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              {[
                ["Destination", showDetail.destination],
                ["Transport", showDetail.transportMode],
                ["Vehicle", showDetail.vehicleNumber || "—"],
                ["Driver", showDetail.driverName || "—"],
                ["Qty Shipped", `${showDetail.quantityShipped} ${showDetail.unit}`],
                ["Expected", new Date(showDetail.expectedDelivery).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>{k}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{v}</div>
                </div>
              ))}
            </div>

            <h4 style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>TRACKING NOTES</h4>
            <div style={{ maxHeight: "120px", overflowY: "auto", marginBottom: "16px" }}>
              {showDetail.trackingNotes?.map((n, i) => (
                <div key={i} style={{ padding: "6px 10px", background: "var(--bg-primary)", borderRadius: "4px", marginBottom: "6px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{n.note}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{n.addedBy} · {new Date(n.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>

            {can("admin", "dispatcher") && (
              <>
                <h4 style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>UPDATE STATUS</h4>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">New Status</label>
                    <select className="form-control" value={statusNote.status} onChange={e => setStatusNote(s => ({ ...s, status: e.target.value }))}>
                      {["pending","in_transit","delivered","delayed","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Note</label>
                    <input className="form-control" placeholder="Update note..." value={statusNote.note} onChange={e => setStatusNote(s => ({ ...s, note: e.target.value }))} />
                  </div>
                </div>
              </>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetail(null)}>Close</button>
              {can("admin", "dispatcher") && (
                <button className="btn btn-primary" onClick={() => updateStatus(showDetail._id)} disabled={saving}>{saving ? "Updating..." : "Update Status"}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}