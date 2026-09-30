import { URL, fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';

export default defineConfig({
    pack: {
        entry: {
            'noeldemartin-solid-utils': 'src/index.ts',
            testing: 'src/testing/index.ts',
            vitest: 'src/vitest/index.ts',
            chai: 'src/chai/index.ts',
        },
        sourcemap: true,
        dts: true,
        fixedExtension: false,
        publint: true,
        attw: { profile: 'esm-only' },
    },
    resolve: {
        alias: {
            '@noeldemartin/solid-utils': fileURLToPath(new URL('./src/', import.meta.url)),
        },
    },
    test: {
        setupFiles: ['./src/testing/setup.ts'],
    },
    fmt: {
        semi: true,
        singleQuote: true,
        tabWidth: 4,
        printWidth: 120,
        sortImports: true,
    },
    lint: {
        options: {
            typeAware: true,
            typeCheck: true,
        },
        rules: {
            'no-console': 'error',
            'no-unused-expressions': 'off',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_+$' }],
            'typescript/consistent-type-imports': 'error',
            'typescript/explicit-module-boundary-types': 'error',
            'typescript/no-explicit-any': ['warn', { ignoreRestArgs: true }],
            'typescript/no-unsafe-declaration-merging': 'off',
        },
        overrides: [
            {
                files: ['**/*.test.ts'],
                rules: { 'typescript/no-duplicate-type-constituents': 'off' },
            },
        ],
    },
});
