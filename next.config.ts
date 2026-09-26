import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['madash.dev'],
  experimental: {
    optimizePackageImports: ['@mui/x-date-pickers', '@mui/x-charts'],
  },
};

export default nextConfig;
