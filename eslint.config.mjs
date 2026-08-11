// @ts-check

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "dist/**",
      ".coverage/**",
      ".eslint/**",
      "vitest.config.ts",
      "vitest.integration.config.ts",
      "commitlint.config.js",
    ],
  },
  {
    files: ["**/*.{js,ts}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["drizzle.config.ts"],
        },
      },
    },
  },
);
