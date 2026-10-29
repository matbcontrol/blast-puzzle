import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const newerThanEditor = (selector, feature) => ({
    selector,
    message: `${feature} does not compile in the Cocos 2.4.15 editor, which runs TypeScript 4.1`,
});

// tsc and ts-jest here run TypeScript 5, so without this list newer syntax would fail only in the editor.
const EDITOR_SYNTAX = [
    newerThanEditor('TSSatisfiesExpression', 'satisfies (TS 4.9)'),
    newerThanEditor('StaticBlock', 'A static block (TS 4.4)'),
    newerThanEditor('[override=true]', 'override (TS 4.3)'),
    newerThanEditor('AccessorProperty, TSAbstractAccessorProperty', 'An accessor field (TS 4.9)'),
    newerThanEditor(
        'ImportSpecifier[importKind=type], ExportSpecifier[exportKind=type]',
        'An inline type modifier (TS 4.5)',
    ),
    newerThanEditor('ExportAllDeclaration[exportKind=type]', 'export type * (TS 5.0)'),
    newerThanEditor('TSTypeParameter[const=true]', 'A const type parameter (TS 5.0)'),
    newerThanEditor('VariableDeclaration[kind=/using/]', 'using (TS 5.2)'),
    {
        // 4.1 compiles these, but one plain style is easier to keep than knowing which type-only form is safe.
        selector: 'ImportDeclaration[importKind=type], ExportNamedDeclaration[exportKind=type][declaration=null]',
        message: 'Use a plain import or export: the codebase keeps one style for the TypeScript 4.1 editor',
    },
];

const NO_COCOS = 'core/ and app/ must not depend on Cocos';
// no-restricted-globals sees cc in values and in extends/implements, not in type annotations or typeof.
const COCOS_TYPES = ['TSQualifiedName[left.name=cc]', 'TSTypeQuery[exprName.name=cc]'].map((selector) => ({
    selector,
    message: NO_COCOS,
}));

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
        files: ['assets/scripts/**/*.ts'],
        rules: {
            'no-restricted-syntax': ['error', ...EDITOR_SYNTAX],
        },
    },
    {
        // Model and controller stay engine-free: that is what keeps them testable in Node.
        files: ['assets/scripts/core/**/*.ts', 'assets/scripts/app/**/*.ts'],
        rules: {
            'no-restricted-globals': ['error', { name: 'cc', message: NO_COCOS }],
            // A later no-restricted-syntax replaces the earlier list instead of adding to it.
            'no-restricted-syntax': ['error', ...EDITOR_SYNTAX, ...COCOS_TYPES],
        },
    },
    {
        files: ['tools/**/*.ts'],
        rules: { 'no-console': 'off' },
    },
    {
        ignores: ['library/', 'temp/', 'local/', 'build/', 'node_modules/', 'types/', 'creator.d.ts', '*.js'],
    },
);
