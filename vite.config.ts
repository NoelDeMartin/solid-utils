import { URL, fileURLToPath } from 'node:url';

import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        sourcemap: true,
        lib: {
            entry: {
                'noeldemartin-solid-utils': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
                'testing': fileURLToPath(new URL('./src/testing/index.ts', import.meta.url)),
            },
            formats: ['es'],
            fileName: (_, entry) => (entry.includes('testing') ? 'testing.js' : 'noeldemartin-solid-utils.js'),
        },
        rollupOptions: {
            external: ['@noeldemartin/utils', 'jsonld', 'md5', 'n3', 'vitest'],
        },
    },
    plugins: [
        dts({
            rollupTypes: true,
            tsconfigPath: './tsconfig.json',
            insertTypesEntry: true,
        }),
    ],
    resolve: {
        alias: {
            '@noeldemartin/solid-utils': fileURLToPath(new URL('./src/', import.meta.url)),
        },
    },
});
