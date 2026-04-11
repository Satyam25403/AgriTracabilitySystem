import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import api from "../utils/api";
import { useSocket } from "../context/SocketContext";
import StatsCard from "../components/StatsCard";
import AlertBanner from "../components/AlertBanner";

const COLORS = ["#4caf6e", "#f0a04b", "#5c9ee0", "#9b7fe8", "#e05c5c", "#6fcf8a", "#c0c0c0"];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [commodityBreakdown, setCommodityBreakdown] = useState([]);
  const [activity, setActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchAll = async () => {
    try {
      const [s, sb, cb, a, al] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/dashboard/status-breakdown"),
        api.get("/dashboard/commodity-breakdown"),
        api.get("/dashboard/recent-activity"),
        api.get("/dashboard/alerts"),
      ]);
      setStats(s.data.stats);
      setStatusBreakdown(sb.data.breakdown.map(b => ({ name: b._id, value: b.count })));
      setCommodityBreakdown(cb.data.breakdown.map(b => ({ name: b._id, value: b.count })));
      setActivity(a.data.activity);
      setAlerts(al.data.alerts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    if (socket) {
      ["batch_created", "batch_status_updated", "inventory_updated", "shipment_dispatched"].forEach(ev => {
        socket.on(ev, fetchAll);
      });
      return () => {
        ["batch_created", "batch_status_updated", "inventory_updated", "shipment_dispatched"].forEach(ev => {
          socket.off(ev, fetchAll);
        });
      };
    }
  }, [socket]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Real-time overview of your supply chain</p>
        </div>
      </div>

      {/* KPI Stats — using StatsCard component */}
      <div className="stats-grid">
        <StatsCard label="Total Batches"     value={stats?.totalBatches}                              icon="⟐"  color="green" />
        <StatsCard label="Active Batches"    value={stats?.activeBatches}                             icon="⟳"  color="blue"  />
        <StatsCard label="Pending Shipments" value={stats?.pendingShipments}                          icon="▷"  color="amber" />
        <StatsCard label="Low Stock Alerts"  value={stats?.lowStockItems}                             icon="⚠"  color="red"   />
        <StatsCard label="Delivered Today"   value={stats?.deliveredToday}                            icon="✓"  color="green" />
        <StatsCard label="Total Stock (kg)"  value={(stats?.totalStock ?? 0).toLocaleString()}        icon="▤"  color="green" />
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: "24px" }}>
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            BATCH STATUS BREAKDOWN
          </h3>
          {statusBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusBreakdown}>
                <XAxis dataKey="name" tick={{ fill: "#4d6b51", fontSize: 11 }} />
                <YAxis tick={{ fill: "#4d6b51", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#162118", border: "1px solid #243826", borderRadius: 6, color: "#e8f5e9" }} />
                <Bar dataKey="value" fill="#4caf6e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No batch data yet</p></div>}
        </div>

        <div className="card">
          <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            COMMODITY MIX
          </h3>
          {commodityBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={commodityBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {commodityBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#162118", border: "1px solid #243826", borderRadius: 6, color: "#e8f5e9" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>No commodity data yet</p></div>}
        </div>
      </div>

      {/* Alerts + Activity — using AlertBanner component */}
      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
            ACTIVE ALERTS ({alerts.length})
          </h3>
          {alerts.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">✓</div><p>No active alerts</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {alerts.slice(0, 6).map((a, i) => (
                <AlertBanner key={i} alert={a} />
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
            RECENT ACTIVITY
          </h3>
          {activity.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📋</div><p>No recent activity</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {activity.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "16px" }}>{a.type === "batch" ? "⟐" : "▷"}</span>
                  <div>
                    <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{a.message}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {new Date(a.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}