import type { NextConfig } from "next";
import os from "os";

// Ensure node binary is findable by Turbopack's internal child process spawning
const nodeBinDir = `${os.homedir()}/node-v22.14.0-darwin-arm64/bin`;
if (!process.env.PATH?.includes(nodeBinDir)) {
  process.env.PATH = `${nodeBinDir}:${process.env.PATH ?? ""}`;
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
