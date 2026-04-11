/**
 * AlertBanner — single alert row, used in Dashboard sidebar and Alerts page
 *
 * Props:
 *   alert   {object}  — { type, severity, message, timestamp }
 *   live    {boolean} — shows "LIVE" tag when true (for socket-pushed alerts)
 */

const TYPE_ICONS = {
  low_stock:        "📦",
  expiry_soon:      "🕒",
  shipment_delayed: "🚛",
};

const SEVERITY_COLORS = {
  danger:  "var(--red)",
  warning: "var(--amber)",
};

export default function AlertBanner({ alert, live = false }) {
  const borderColor = SEVERITY_COLORS[alert.severity] || "var(--amber)";
  const icon        = TYPE_ICONS[alert.type] || "⚠";

  return (
    <div
      style={{
        padding:      "12px 16px",
        background:   "var(--bg-primary)",
        borderRadius: "var(--radius-sm)",
        borderLeft:   `3px solid ${borderColor}`,
        display:      "flex",
        gap:          "12px",
        alignItems:   "center",
      }}
    >
      <span style={{ fontSize: "20px" }}>{icon}</span>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
          {alert.message}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", textTransform: "uppercase" }}>
          {live && <span style={{ color: "var(--green-primary)", marginRight: "6px" }}>● LIVE ·</span>}
          {alert.type?.replace(/_/g, " ")}
          {alert.timestamp && (
            <span style={{ marginLeft: "6px" }}>
              · {live
                  ? new Date(alert.timestamp).toLocaleTimeString()
                  : new Date(alert.timestamp).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <span
        style={{
          fontSize:        "10px",
          padding:         "2px 8px",
          borderRadius:    "10px",
          background:      alert.severity === "danger"
                             ? "rgba(224,92,92,0.15)"
                             : "rgba(240,160,75,0.15)",
          color:           borderColor,
          fontWeight:      700,
          textTransform:   "uppercase",
          whiteSpace:      "nowrap",
        }}
      >
        {alert.severity}
      </span>
    </div>
  );
}