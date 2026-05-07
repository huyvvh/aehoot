/**
 * Custom server: Next.js + Socket.IO on the same port.
 * Run with: tsx server.ts (dev) or NODE_ENV=production tsx server.ts (prod)
 */
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { setupSocketHandlers } from "@/socket/handlers";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  setupSocketHandlers(io);

  httpServer.listen(port, () => {
    const env = dev ? "development" : "production";
    console.log(`> Ready on http://${hostname}:${port} [${env}]`);
    console.log(`> Socket.IO attached to same port`);
  });
});
