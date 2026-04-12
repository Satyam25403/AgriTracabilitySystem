import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const NAV_ITEMS = [
  { to: "/dashboard",  label: "Dashboard",   icon: "⊞",  roles: ["admin","farmer","processor","warehouse","dispatcher"] },
  { to: "/batches",    label: "Batches",      icon: "⟐",  roles: ["admin","farmer","processor","warehouse","dispatcher"] },
  { to: "/suppliers",  label: "Suppliers",    icon: "🤝", roles: ["admin","farmer"] },
  { to: "/processing", label: "Processing",   icon: "⟳",  roles: ["admin","processor"] },
  { to: "/inventory",  label: "Inventory",    icon: "▤",  roles: ["admin","warehouse"] },
  { to: "/shipments",  label: "Shipments",    icon: "▷",  roles: ["admin","dispatcher","warehouse"] },
  { to: "/alerts",     label: "Alerts",       icon: "⚠",  roles: ["admin","warehouse","dispatcher"] },
  { to: "/users",      label: "Users",        icon: "👤", roles: ["admin"] },
];

const PAGE_TITLES = {
  "/dashboard":  "Dashboard",
  "/batches":    "Batch Management",
  "/suppliers":  "Suppliers & Farmer Groups",
  "/processing": "Processing Tracker",
  "/inventory":  "Inventory",
  "/shipments":  "Shipments",
  "/alerts":     "Alerts",
  "/users":      "User Management",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || "AgriTrace";

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🌾 AgriTrace</h1>
          <span>Commodity Traceability</span>
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-avatar">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <span style={{ fontSize: 13 }}>↩</span> Sign out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            agritrace / <span>{pageTitle.toLowerCase()}</span>
          </div>
          <div className="socket-status">
            <div className={`socket-dot ${connected ? "online" : ""}`} />
            {connected ? "Live" : "Reconnecting..."}
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}