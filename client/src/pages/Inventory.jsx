import { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import StatusBadge from "../components/StatusBadge";
import toast from "react-hot-toast";

export default function Inventory() {
  const { can } = useAuth();
  const { socket } = useSocket();
  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAdjust, setShowAdjust] = useState(null);
  const [form, setForm] = useState({ batchId: "", warehouseLocation: "", availableStock: "", unit: "kg", lowStockThreshold: 100, expiryDate: "" });
  const [adjust, setAdjust] = useState({ adjustment: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // Fetch inventory and warehoused batches
  const fetch = async () => {
    setLoading(true);
    try {
      const [inv, bat] = await Promise.all([
        api.get("/inventory", { params: { lowStock: lowStockOnly || undefined } }),
        api.get("/batches", { params: { status: "warehoused" } }),
      ]);
      setInventory(inv.data.inventory);
      setBatches(bat.data.batches);
    } catch (e) { toast.error("Failed to load inventory"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [lowStockOnly]);
  useEffect(() => {
    if (socket) { socket.on("inventory_updated", fetch); return () => socket.off("inventory_updated", fetch); }
  }, [socket]);


  // Handlers for creating inventory records and adjusting stock
  const submit = async () => {
    if (!form.batchId || !form.warehouseLocation || !form.availableStock) return toast.error("Fill required fields");
    setSaving(true);
    try {
      await api.post("/inventory", { ...form, availableStock: Number(form.availableStock), lowStockThreshold: Number(form.lowStockThreshold) });
      toast.success("Inventory record created");
      setShowModal(false);
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  // Handler for adjusting stock levels with reason
  const submitAdjust = async () => {
    if (!adjust.adjustment) return toast.error("Enter adjustment amount");
    setSaving(true);
    try {
      await api.patch(`/inventory/${showAdjust._id}/adjust`, { adjustment: Number(adjust.adjustment), reason: adjust.reason });
      toast.success("Stock adjusted");
      setShowAdjust(null);
      setAdjust({ adjustment: "", reason: "" });
      fetch();
    } catch (e) { toast.error("Failed to adjust stock"); }
    finally { setSaving(false); }
  };

  const isLow = (item) => item.availableStock < item.lowStockThreshold;
  const isExpiring = (item) => {
    if (!item.expiryDate) return false;
    const days = Math.ceil((new Date(item.expiryDate) - new Date()) / 86400000);
    return days <= 7 && days > 0;
  };

  return (
    // Inventory Management Page
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Inventory</h2>
          <p className="page-subtitle">Warehouse stock levels and management</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className={`btn ${lowStockOnly ? "btn-primary" : "btn-secondary"}`} onClick={() => setLowStockOnly(!lowStockOnly)}>
            ⚠ Low Stock Only
          </button>
          {can("admin", "warehouse") && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Inventory</button>
          )}
        </div>
      </div>

      {/* // Inventory Table */}
      <div className="card">
        {loading ? (
          <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : inventory.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">▤</div><p>No inventory records. Add batches to warehouse first.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Batch ID</th><th>Commodity</th><th>Warehouse</th><th>Available</th><th>Reserved</th><th>Threshold</th><th>Expiry</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item._id}>
                    <td><span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--green-primary)" }}>{item.batchId?.batchId}</span></td>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{item.batchId?.commodityType}</td>
                    <td>{item.warehouseLocation}</td>
                    <td style={{ color: isLow(item) ? "var(--red)" : "var(--text-primary)", fontWeight: 600 }}>
                      {item.availableStock} {item.unit}
                    </td>
                    <td>{item.reservedStock} {item.unit}</td>
                    <td style={{ color: "var(--text-muted)" }}>{item.lowStockThreshold} {item.unit}</td>
                    <td style={{ color: isExpiring(item) ? "var(--red)" : "var(--text-muted)" }}>
                      {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      {isLow(item) && <StatusBadge status="delayed" label="Low" />}
                      {isExpiring(item) && <StatusBadge status="delayed" label="Expiring" />}
                      {!isLow(item) && !isExpiring(item) && <StatusBadge status="delivered" label="OK" />}
                    </td>
                    <td>
                      {can("admin", "warehouse") && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowAdjust(item)}>Adjust</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Inventory Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Inventory Record</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Batch *</label>
              <select className="form-control" value={form.batchId} onChange={set("batchId")}>
                <option value="">-- Select warehoused batch --</option>
                {batches.map(b => <option key={b._id} value={b._id}>{b.batchId} — {b.commodityType}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Warehouse Location *</label>
              <input className="form-control" placeholder="Warehouse A, Cold Storage B..." value={form.warehouseLocation} onChange={set("warehouseLocation")} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Available Stock *</label>
                <input className="form-control" type="number" value={form.availableStock} onChange={set("availableStock")} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-control" value={form.unit} onChange={set("unit")}>
                  <option value="kg">kg</option><option value="tonnes">Tonnes</option>
                  <option value="quintal">Quintal</option><option value="bags">Bags</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Low Stock Threshold</label>
                <input className="form-control" type="number" value={form.lowStockThreshold} onChange={set("lowStockThreshold")} />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input className="form-control" type="date" value={form.expiryDate} onChange={set("expiryDate")} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjust && (
        <div className="modal-overlay" onClick={() => setShowAdjust(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Adjust Stock</h3>
              <button className="modal-close" onClick={() => setShowAdjust(null)}>×</button>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>
              Current stock: <strong style={{ color: "var(--text-primary)" }}>{showAdjust.availableStock} {showAdjust.unit}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Adjustment Amount</label>
              <input className="form-control" type="number" placeholder="+100 to add, -50 to deduct" value={adjust.adjustment} onChange={e => setAdjust(a => ({ ...a, adjustment: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Reason</label>
              <input className="form-control" placeholder="Dispatch, damage, recount..." value={adjust.reason} onChange={e => setAdjust(a => ({ ...a, reason: e.target.value }))} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdjust(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitAdjust} disabled={saving}>{saving ? "Saving..." : "Apply"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}