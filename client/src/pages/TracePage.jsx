import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";

const STAGE_ICONS = { sourced: "🌾", cleaning: "🧹", grading: "⚖️", packaging: "📦", warehoused: "🏭", shipped: "🚛", delivered: "✅" };

export default function TracePage() {
  const { batchId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const API_BASE = process.env.REACT_APP_API_URL || "/api";
    fetch(`${API_BASE}/trace/${batchId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); else setError(d.message); })
      .catch(() => setError("Failed to load batch data"))
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
      <div className="spinner" />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", padding: "20px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
        <h2 style={{ fontFamily: "var(--font-mono)", color: "var(--red)", marginBottom: "8px" }}>Batch Not Found</h2>
        <p style={{ color: "var(--text-muted)" }}>{error}</p>
      </div>
    </div>
  );

  const { batch, timeline, inventory, shipments } = data;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", padding: "20px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>🌾</div>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--text-muted)", marginBottom: "6px" }}>AGRITRACE — BATCH CERTIFICATE</h1>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", color: "var(--green-primary)", fontWeight: 700 }}>{batch.batchId}</div>
          <StatusBadge status={batch.currentStatus} />
        </div>

        {/* Batch Info */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>BATCH INFORMATION</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            {[
              ["Commodity", batch.commodityType],
              ["Farmer", batch.farmerName],
              ["Farm Location", batch.farmLocation],
              ["Harvest Date", new Date(batch.harvestDate).toLocaleDateString()],
              ["Quantity", `${batch.quantity} ${batch.unit}`],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "3px" }}>{k}</div>
                <div style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory */}
        {inventory && (
          <div className="card" style={{ marginBottom: "20px" }}>
            <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>WAREHOUSE</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Location</div>
                <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{inventory.warehouseLocation}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Available</div>
                <div style={{ fontSize: "14px", color: "var(--green-primary)", fontWeight: 600 }}>{inventory.availableStock} {inventory.unit}</div>
              </div>
              {inventory.expiryDate && (
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Expiry</div>
                  <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{new Date(inventory.expiryDate).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)", marginBottom: "20px" }}>JOURNEY TIMELINE</h3>
          {timeline.map((event, i) => (
            <div key={i} style={{ display: "flex", gap: "14px", marginBottom: i < timeline.length - 1 ? "0" : "0" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                  background: event.completed ? "var(--green-muted)" : "var(--bg-primary)",
                  border: `2px solid ${event.completed ? "var(--green-primary)" : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
                }}>{STAGE_ICONS[event.stage] || "●"}</div>
                {i < timeline.length - 1 && (
                  <div style={{ width: "2px", flex: 1, minHeight: "20px", background: event.completed ? "var(--green-dim)" : "var(--border)", margin: "4px 0" }} />
                )}
              </div>
              <div style={{ paddingBottom: "20px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "14px", color: event.completed ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 500 }}>{event.label}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{new Date(event.timestamp).toLocaleDateString()}</div>
                </div>
                {event.location && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>📍 {event.location}</div>}
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>{event.details}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "11px", marginTop: "24px" }}>
          Verified by AgriTrace · {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}