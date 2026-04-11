import { useEffect, useState } from "react";
import api from "../utils/api";
import { useSocket } from "../context/SocketContext";
import AlertBanner from "../components/AlertBanner";

export default function Alerts() {
  const { socket } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const res = await api.get("/dashboard/alerts");
      setAlerts(res.data.alerts);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetch();
    if (socket) {
      const handler = (data) => setLiveAlerts(prev => [{ ...data, live: true }, ...prev].slice(0, 20));
      ["low_stock_alert", "expiry_alert", "delay_alert"].forEach(ev => socket.on(ev, handler));
      return () => ["low_stock_alert", "expiry_alert", "delay_alert"].forEach(ev => socket.off(ev, handler));
    }
  }, [socket]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Alerts</h2>
          <p className="page-subtitle">Active system alerts and notifications</p>
        </div>
        <button className="btn btn-secondary" onClick={fetch}>↺ Refresh</button>
      </div>

      {/* Live socket-pushed alerts — using AlertBanner component */}
      {liveAlerts.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--green-primary)", marginBottom: "12px" }}>
            ● LIVE ALERTS
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {liveAlerts.map((a, i) => (
              <AlertBanner key={i} alert={a} live={true} />
            ))}
          </div>
        </div>
      )}

      {/* Persisted alerts from DB — using AlertBanner component */}
      <div className="card">
        <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
          CURRENT ALERTS ({alerts.length})
        </h3>
        {loading ? (
          <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : alerts.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">✓</div><p>No active alerts. All systems normal.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {alerts.map((a, i) => (
              <AlertBanner key={i} alert={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}