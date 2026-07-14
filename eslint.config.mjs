import { dirname } from "path";
import { fileURLToPath } from "url";
import nextConfig from "eslint-config-next/core-web-vitals";
import { defineConfig } from "eslint/config";

const __filename = fileURLToPath( import.meta.url );
const __dirname = dirname( __filename );

export default defineConfig( [
  // 1. Load the native flat config provided by Next.js 16
  // This replaces both 'next/core-web-vitals' and 'next/typescript'
  nextConfig,

  // 2. Your custom overrides
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // 3. Global ignores (Next.js 16 handles .next, but add extras here)
  {
    ignores: [ ".next/*", "out/*", "dist/*", "tests/**" ],
  }
] );