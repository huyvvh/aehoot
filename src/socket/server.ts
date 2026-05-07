import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./handlers";

let started = false;

export function startSocketServer() {
  if (started) return;
  started = true;

  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  setupSocketHandlers(io);

  const port = parseInt(process.env.SOCKET_PORT || "3001", 10);
  httpServer.listen(port, () => {
    console.log(`[Socket.IO] Server running on port ${port}`);
  });
}
