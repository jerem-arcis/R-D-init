import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Config ESLint « flat » (v9). Objectif principal : détecter le code mort
// (imports/variables inutilisés) et les erreurs de hooks React. Volontairement
// souple (warnings) pour ne pas bloquer le build.
export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.power/**',
      'src/generated/**', // modèles Dataverse générés
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Rend no-unused-vars conscient du JSX (évite les faux positifs).
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'no-unused-vars': [
        'warn',
        { args: 'none', varsIgnorePattern: '^_' },
      ],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    // Fichiers de test : globals vitest.
    files: ['**/*.test.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.node, describe: 'readonly', it: 'readonly', expect: 'readonly', vi: 'readonly', beforeEach: 'readonly', afterEach: 'readonly' },
    },
  },
];
