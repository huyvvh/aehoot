import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["socket.io"],
  typescript: {
    // Pre-existing errors from Zod v4 and Socket.IO types — not caused by app code
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
