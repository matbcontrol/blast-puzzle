import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        files: ['**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            eqeqeq: 'error',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
    },
    {
        // Model and controller stay engine-free: that is what keeps them testable in Node.
        files: ['assets/scripts/core/**/*.ts', 'assets/scripts/app/**/*.ts'],
        rules: {
            'no-restricted-globals': ['error', { name: 'cc', message: 'core/ and app/ must not depend on Cocos' }],
        },
    },
    {
        files: ['tools/**/*.ts'],
        rules: { 'no-console': 'off' },
    },
    {
        ignores: ['library/', 'temp/', 'local/', 'build/', 'node_modules/', 'creator.d.ts', '*.js'],
    },
);
