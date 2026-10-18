import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: [
            'dist/**',
            'standalone.js',
            'coverage/**',
            'node_modules/**',
            '.vite/**',
            'playwright-report/**',
            'test-results/**',
            'blob-report/**'
        ]
    },
    js.configs.recommended,
    {
        files: ['**/*.{js,mjs}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            'no-console': 'off',
            'no-unused-vars': [
                'error',
                {
                    args: 'none',
                    caughtErrorsIgnorePattern: '^_'
                }
            ]
        }
    }
];
