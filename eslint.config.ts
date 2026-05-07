// eslint.config.ts
import tsEslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * @ai_context: F8 - Quality Assurance & Type Safety
 * PSA Business Suite Strict ESLint Configuration (v9 Flat Config).
 */
export default tsEslint.config(
  ...tsEslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Zero-tolerance for 'any' in Domain/Application layer
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
    ignores: [
      'dist/**',
      'functions/**',
      'node_modules/**',
      '*.config.ts',
      '*.config.js',
      'scripts/**',
    ]
  }
);
