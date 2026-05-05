const { checkShipmentDelays } = require("../utils/alertEngine");

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log(` Client connected: ${socket.id}`);

    // Client joins a room (optional - for role-specific events)
    socket.on("join_room", (room) => {
      socket.join(room);
      console.log(`📦 Socket ${socket.id} joined room: ${room}`);
    });

    // Client can manually trigger a delay check
    socket.on("check_delays", async () => {
      const count = await checkShipmentDelays(io);
      socket.emit("delay_check_result", { overdueCount: count });
    });

    // Handle client disconnect
    socket.on("disconnect", () => {
      console.log(` Client disconnected: ${socket.id}`);
    });
  });

  // Run shipment delay check every 60 seconds
  setInterval(async () => {
    await checkShipmentDelays(io);
  }, 60 * 1000);
};

module.exports = socketHandler;