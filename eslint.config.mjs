import prettier from "eslint-plugin-prettier";
import recommended from "eslint/recommended";

export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json"
      }
    },
    plugins: {
      prettier: prettier
    },
    rules: {
      "prettier/prettier": "error",
      ...recommended,
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