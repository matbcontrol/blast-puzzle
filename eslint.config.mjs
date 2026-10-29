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
        // The model must stay engine-free: that is what keeps it testable in Node.
        files: ['assets/scripts/core/**/*.ts'],
        rules: {
            'no-restricted-globals': ['error', { name: 'cc', message: 'core/ must not depend on Cocos' }],
        },
    },
    {
        ignores: ['library/', 'temp/', 'local/', 'build/', 'node_modules/', 'creator.d.ts', '*.js'],
    },
);
