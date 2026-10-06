import { dirname } from "path";
import { fileURLToPath } from "url";

import eslintReact from "@eslint-react/eslint-plugin";
import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig } from "eslint/config";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import importX from "eslint-plugin-import-x";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import reactHooks from "eslint-plugin-react-hooks";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath( import.meta.url );
const __dirname = dirname( __filename );

export default defineConfig( [
  // 1. What eslint-config-next/core-web-vitals gave us, composed from plugins
  // that support ESLint 10 (#79). Next's own config still pulls in
  // eslint-plugin-react 7 and eslint-plugin-import 2, which don't, so it
  // needed peer overrides and shims. Swaps: eslint-plugin-react ->
  // @eslint-react, eslint-plugin-import -> import-x, eslint-plugin-jsx-a11y ->
  // its ESLint 10 fork jsx-a11y-x, Next's Babel parser -> typescript-eslint.
  {
    name: "next/core-web-vitals",
    files: [ "**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}" ],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { sourceType: "module", ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs[ "core-web-vitals" ].rules,
      ...reactHooks.configs.recommended.rules,
      "jsx-a11y/alt-text": [ "warn", { elements: [ "img" ], img: [ "Image" ] } ],
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-proptypes": "warn",
      "jsx-a11y/aria-unsupported-elements": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
    },
  },
  {
    files: [ "**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}" ],
    ...eslintReact.configs.recommended,
    rules: {
      ...eslintReact.configs.recommended.rules,
      // React 19 style migrations eslint-plugin-react never asked for; not
      // worth churning every provider over.
      "@eslint-react/no-context-provider": "off",
      "@eslint-react/no-use-context": "off",
      "@eslint-react/naming-convention-ref-name": "off",
      // Duplicates of the react-hooks rules above.
      "@eslint-react/set-state-in-effect": "off",
      "@eslint-react/rules-of-hooks": "off",
    },
  },

  // 2. Your custom overrides
  {
    settings: {
      ...importX.flatConfigs.typescript.settings,
      "import-x/resolver": undefined,
      "import-x/resolver-next": [ createTypeScriptImportResolver() ],
    },
    plugins: {
      "import-x": importX,
      unicorn,
    },
    rules: {
      "import-x/no-anonymous-default-export": "warn",
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

  // 4. Global ignores
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "next-env.d.ts",
      "tests/**",
      "session-server/**",
    ],
  }
] );