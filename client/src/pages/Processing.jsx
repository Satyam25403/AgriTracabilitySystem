import { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import toast from "react-hot-toast";

const STAGES = ["cleaning", "grading", "packaging", "warehoused", "shipped", "delivered"];
const STAGE_ICONS = { sourced: "🌾", cleaning: "🧹", grading: "⚖️", packaging: "📦", warehoused: "🏭", shipped: "🚛", delivered: "✅" };

export default function Processing() {
  const { can } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ batchId: "", stage: "cleaning", notes: "", quantityAfter: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.get("/batches", { params: { status: "sourced,cleaning,grading,packaging" } })
      .then(r => setBatches(r.data.batches))
      .catch(() => {});
    // Load all active batches
    api.get("/batches").then(r => setBatches(r.data.batches)).catch(() => {});
  }, []);

  const selectBatch = async (batch) => {
    setSelectedBatch(batch);
    setForm(f => ({ ...f, batchId: batch._id }));
    setLoadingLogs(true);
    try {
      const res = await api.get(`/processing/${batch._id}`);
      setLogs(res.data.logs);
    } catch (e) { setLogs([]); }
    finally { setLoadingLogs(false); }
  };

  const submit = async () => {
    if (!form.batchId || !form.stage) return toast.error("Select batch and stage");
    setSaving(true);
    try {
      await api.post("/processing", {
        batchId: form.batchId,
        stage: form.stage,
        notes: form.notes,
        quantityAfter: form.quantityAfter ? Number(form.quantityAfter) : undefined,
        location: form.location,
      });
      toast.success(`Stage updated to: ${form.stage}`);
      setShowModal(false);
      if (selectedBatch) selectBatch(selectedBatch);
      api.get("/batches").then(r => setBatches(r.data.batches));
    } catch (e) { toast.error(e.response?.data?.message || "Failed to update stage"); }
    finally { setSaving(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Processing Tracker</h2>
          <p className="page-subtitle">Log and monitor batch processing stages</p>
        </div>
        {can("admin", "processor", "warehouse", "dispatcher") && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Log Stage Update</button>
        )}
      </div>

      <div className="grid-2">
        {/* Batch List */}
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>SELECT BATCH</h3>
          {batches.length === 0 ? (
            <div className="empty-state"><p>No batches available</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "500px", overflowY: "auto" }}>
              {batches.map(b => (
                <div key={b._id}
                  onClick={() => selectBatch(b)}
                  style={{
                    padding: "12px 14px",
                    background: selectedBatch?._id === b._id ? "var(--green-muted)" : "var(--bg-primary)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    border: `1px solid ${selectedBatch?._id === b._id ? "var(--green-dim)" : "var(--border)"}`,
                    transition: "all 0.15s",
                  }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--green-primary)" }}>{b.batchId}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: "2px" }}>{b.commodityType} — {b.farmerName}</div>
                  <div style={{ marginTop: "6px" }}><StatusBadge status={b.currentStatus} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
            {selectedBatch ? `TIMELINE — ${selectedBatch.batchId}` : "SELECT A BATCH"}
          </h3>

          {!selectedBatch ? (
            <div className="empty-state"><div className="empty-icon">⟳</div><p>Select a batch to view its processing timeline</p></div>
          ) : loadingLogs ? (
            <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : (
            <div style={{ position: "relative" }}>
              {/* Sourced entry always first */}
              {[
                { stage: "sourced", timestamp: selectedBatch.createdAt, operatorName: selectedBatch.createdBy?.name || "System", notes: `${selectedBatch.quantity} ${selectedBatch.unit} harvested`, location: selectedBatch.farmLocation },
                ...logs
              ].map((log, i, arr) => (
                <div key={i} style={{ display: "flex", gap: "14px", marginBottom: i < arr.length - 1 ? "0" : "0" }}>
                  {/* Icon + Line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      background: "var(--green-muted)", border: "2px solid var(--green-primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "14px", flexShrink: 0,
                    }}>{STAGE_ICONS[log.stage] || "●"}</div>
                    {i < arr.length - 1 && (
                      <div style={{ width: "2px", flex: 1, minHeight: "24px", background: "var(--border)", margin: "4px 0" }} />
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: "20px", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <StatusBadge status={log.stage} />
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    {log.location && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>📍 {log.location}</div>}
                    {log.notes && <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>{log.notes}</div>}
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>by {log.operatorName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Stage Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Log Processing Stage</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Select Batch *</label>
              <select className="form-control" value={form.batchId} onChange={e => { set("batchId")(e); const b = batches.find(x => x._id === e.target.value); if(b) selectBatch(b); }}>
                <option value="">-- Select batch --</option>
                {batches.map(b => <option key={b._id} value={b._id}>{b.batchId} — {b.commodityType}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">New Stage *</label>
              <select className="form-control" value={form.stage} onChange={set("stage")}>
                {STAGES.map(s => <option key={s} value={s}>{STAGE_ICONS[s]} {s}</option>)}
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Quantity After Stage</label>
                <input className="form-control" type="number" placeholder="Remaining quantity" value={form.quantityAfter} onChange={set("quantityAfter")} />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-control" placeholder="Unit/Facility name" value={form.location} onChange={set("location")} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-control" placeholder="Observations, quality notes..." value={form.notes} onChange={set("notes")} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Log Stage"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}