import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // nodemailer must stay a real Node module rather than being bundled
  serverExternalPackages: ["nodemailer"],
  // Server actions refuse bodies over 1 MB by default, which quietly capped
  // lead files (promised at 20 MB) and template header images (5 MB). The
  // actions check their own limits and say so in words.
  experimental: {
    serverActions: { bodySizeLimit: "21mb" },
  },
};

export default nextConfig;
