import js from "@eslint/js";
import prettier from "eslint-plugin-prettier";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    plugins: {
      prettier: prettier
    },
    rules: {
      "prettier/prettier": "error",
      "no-console": "warn",
      "no-unused-vars": "error",
      "no-unused-expressions": "error",
      "prefer-const": "error",
      "eqeqeq": ["error", "always"],
      "no-throw-literal": "error"
    }
  },
  {
    ignores: ["dist", "node_modules", "*.config.mjs"]
  }
];