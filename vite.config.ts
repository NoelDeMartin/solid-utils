import { URL, fileURLToPath } from 'node:url';

import { fmt, lint } from '@noeldemartin/vite-plus-config';
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
    fmt,
    lint: { extends: [lint] },
});
