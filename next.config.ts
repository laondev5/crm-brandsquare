import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // nodemailer must stay a real Node module rather than being bundled
  serverExternalPackages: ["nodemailer"],
};

export default nextConfig;
