import { dirname } from "path";
import { fileURLToPath } from "url";

import { defineConfig } from "eslint/config";
import nextConfig from "eslint-config-next/core-web-vitals";
import importPlugin from "eslint-plugin-import";
import unicorn from "eslint-plugin-unicorn";

const __filename = fileURLToPath( import.meta.url );
const __dirname = dirname( __filename );

export default defineConfig( [
  // 1. Load the native flat config provided by Next.js 16
  // This replaces both 'next/core-web-vitals' and 'next/typescript'
  nextConfig,

  // 2. Your custom overrides
  {
    plugins: {
      import: importPlugin,
      unicorn,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",

      "import/no-cycle": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [ "./*", "../*" ],
              message: "Use absolute @/ paths instead of relative imports.",
              allowTypeImports: true,
            },
          ],
        },
      ],
      "import/order": [
        "error",
        {
          groups: [ "builtin", "external", "internal", "parent", "sibling", "index" ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "unicorn/filename-case": [
        "error",
        {
          cases: { kebabCase: true, pascalCase: true },
          ignore: [
            "index.tsx",
            "route.ts",
            "route.tsx",
            "layout.tsx",
            "page.tsx",
            "loading.tsx",
            "error.tsx",
            "not-found.tsx",
            "template.tsx",
            "instrumentation.ts",
            "middleware.ts",
            "types.ts",
            "utils.ts",
            "global.css",
          ],
        },
      ],
    },
  },

  // 3. Files where a default export is required by Next.js conventions
  {
    files: [
      "**/app/**/{page,layout,error,not-found,loading,template,default}.tsx",
      "**/app/**/route.ts",
      "**/*.config.{ts,js,mjs,mts}",
    ],
    rules: { "import/no-cycle": "off" },
  },

  // 4. settings.ts intentionally re-exports session-server/session-common,
  // which lives outside the @/ (src/*) alias root — relative import is the
  // only option here.
  {
    files: [ "src/settings.ts" ],
    rules: { "no-restricted-imports": "off" },
  },

  // 4. Global ignores (Next.js 16 handles .next, but add extras here)
  {
    ignores: [ ".next/*", "out/*", "dist/*", "tests/**", "session-server/**" ],
  }
] );