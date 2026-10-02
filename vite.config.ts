import { URL, fileURLToPath } from 'node:url';

import { fmt, lint, pack } from '@noeldemartin/vite-plus-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
    pack: {
        ...pack,
        entry: {
            index: 'src/index.ts',
            testing: 'src/testing/index.ts',
            vitest: 'src/vitest/index.ts',
            chai: 'src/chai/index.ts',
        },
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
