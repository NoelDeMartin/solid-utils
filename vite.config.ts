import { URL, fileURLToPath } from 'node:url';

import dts from 'vite-plugin-dts';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    build: {
        sourcemap: true,
        lib: {
            entry: {
                'noeldemartin-solid-utils': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
                'testing': fileURLToPath(new URL('./src/testing/index.ts', import.meta.url)),
                'vitest': fileURLToPath(new URL('./src/vitest/index.ts', import.meta.url)),
                'chai': fileURLToPath(new URL('./src/chai/index.ts', import.meta.url)),
            },
            formats: ['es'],
            fileName: (_, entry) => {
                if (entry.includes('testing')) {
                    return 'testing.js';
                }

                if (entry.includes('vitest')) {
                    return 'vitest.js';
                }

                if (entry.includes('chai')) {
                    return 'chai.js';
                }

                return 'noeldemartin-solid-utils.js';
            },
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
    test: {
        setupFiles: ['./src/testing/setup.ts'],
    },
});
