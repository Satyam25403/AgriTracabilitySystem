import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Batches from "./pages/Batches";
import Processing from "./pages/Processing";
import Inventory from "./pages/Inventory";
import Shipments from "./pages/Shipments";
import TracePage from "./pages/TracePage";
import Alerts from "./pages/Alerts";
import Suppliers from "./pages/Suppliers";
import Users from "./pages/Users";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ style: { borderRadius: "8px", background: "#1a2e1a", color: "#e8f5e9" } }} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/trace/:batchId" element={<TracePage />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"  element={<Dashboard />} />
              <Route path="batches"    element={<Batches />} />
              <Route path="processing" element={<Processing />} />
              <Route path="inventory"  element={<Inventory />} />
              <Route path="shipments"  element={<Shipments />} />
              <Route path="suppliers"  element={<Suppliers />} />
              <Route path="users"      element={<Users />} />
              <Route path="alerts"     element={<Alerts />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}