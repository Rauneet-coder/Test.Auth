import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-undef": "error",
      "no-constant-condition": "warn",
      "no-duplicate-imports": "error",
      "prefer-const": "warn",
      "eqeqeq": ["error", "always"],
      "no-var": "error",
    },
  },
  {
    ignores: ["node_modules/", "build/", "*.config.js"],
  },
];
