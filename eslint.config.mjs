import { dirname } from "path";
import { fileURLToPath } from "url";

import { defineConfig } from "eslint/config";
import nextConfig from "eslint-config-next/core-web-vitals";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import importX from "eslint-plugin-import-x";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath( import.meta.url );
const __dirname = dirname( __filename );

export default defineConfig( [
  // 1. Load the native flat config provided by Next.js 16
  // This replaces both 'next/core-web-vitals' and 'next/typescript'
  nextConfig,

  // Next parses JS with its bundled Babel parser, whose scope manager lacks
  // addGlobals() (required since ESLint 10). typescript-eslint parses JS too.
  {
    files: [ "**/*.{js,mjs,cjs,jsx}" ],
    languageOptions: { parser: tseslint.parser },
  },

  // 2. Your custom overrides
  {
    // eslint-plugin-import crashes on ESLint 10 (#59); import-x is its fork.
    settings: {
      ...importX.flatConfigs.typescript.settings,
      "import-x/resolver": undefined,
      "import-x/resolver-next": [ createTypeScriptImportResolver() ],
      // Explicit: "detect" calls context.getFilename(), removed in ESLint 10.
      react: { version: "19.2" },
    },
    plugins: {
      "import-x": importX,
      unicorn,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",

      "import-x/no-cycle": "error",
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
      "import-x/order": [
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
    rules: { "import-x/no-cycle": "off" },
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