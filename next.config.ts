import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@mui/x-date-pickers', '@mui/x-charts'],
  },
};

export default nextConfig;
