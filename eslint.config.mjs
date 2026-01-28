import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import parser from '@typescript-eslint/parser';
import plugin from '@typescript-eslint/eslint-plugin';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: parser,
      parserOptions: {
        project: './tsconfig.json'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly'
      }
    },
    plugins: {
      prettier: prettier,
      '@typescript-eslint': plugin
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-expressions': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'no-throw-literal': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-case-declarations': 'error'
    }
  },
  {
    ignores: ['dist', 'node_modules', '*.config.mjs']
  }
];