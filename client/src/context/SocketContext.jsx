import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const SocketContext = createContext(null);


// Provides a WebSocket connection to the backend and listens for real-time events
export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";
    socketRef.current = io(SERVER_URL, { withCredentials: true });

    // Connection status listeners
    socketRef.current.on("connect", () => setConnected(true));
    socketRef.current.on("disconnect", () => setConnected(false));

    // Global toast notifications for real-time events
    socketRef.current.on("batch_created", (data) => {
      toast.success(`New batch created: ${data.batchId} (${data.commodityType})`);
    });

    // Listen for batch status updates and show a toast notification
    socketRef.current.on("batch_status_updated", (data) => {
      toast(`Batch ${data.batchId} → ${data.newStatus}`, { icon: "🔄" });
    });

    // Listen for inventory updates and show a toast notification
    socketRef.current.on("inventory_updated", (data) => {
      toast(`Inventory updated: ${data.batchId}`, { icon: "📦" });
    });

    // Listen for alerts and show error toasts
    socketRef.current.on("low_stock_alert", (data) => {
      toast.error(`⚠️ ${data.message}`, { duration: 6000 });
    });

    // Listen for expiry alerts and show error toasts
    socketRef.current.on("expiry_alert", (data) => {
      toast.error(`🕒 ${data.message}`, { duration: 8000 });
    });

    // Listen for delay alerts and show error toasts
    socketRef.current.on("delay_alert", (data) => {
      toast.error(`🚨 ${data.message}`, { duration: 8000 });
    });

    // Listen for shipment dispatch events and show success toasts
    socketRef.current.on("shipment_dispatched", (data) => {
      toast.success(`Shipment dispatched to ${data.destination}`, { duration: 5000 });
    });

    return () => socketRef.current?.disconnect();
  }, []);

  return (
    // Provide the socket instance and connection status to the app
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);