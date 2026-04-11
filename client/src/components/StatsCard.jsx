/**
 * StatsCard — KPI metric card for the Dashboard
 *
 * Props:
 *   label     {string}  — card title e.g. "Total Batches"
 *   value     {number}  — the big number
 *   icon      {string}  — emoji or symbol shown top-right
 *   color     {string}  — accent color: "green" | "blue" | "amber" | "red" (default green)
 *   subtitle  {string}  — optional small text below the value
 */
export default function StatsCard({ label, value, icon, color = "green", subtitle }) {
  return (
    <div className={`stat-card ${color !== "green" ? color : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? 0}</div>
      {subtitle && (
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
          {subtitle}
        </div>
      )}
      <div className="stat-icon">{icon}</div>
    </div>
  );
}