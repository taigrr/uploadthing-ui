import type { NextConfig } from "next";

// Validate environment variables at build/startup time.
import "./env.js";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    registry: ["./registry/**/*"],
  },
};

export default nextConfig;
