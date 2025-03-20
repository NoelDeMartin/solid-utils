import { URL, fileURLToPath } from 'node:url';

import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        sourcemap: true,
        lib: {
            entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
            formats: ['es'],
            fileName: 'noeldemartin-solid-utils',
        },
        rollupOptions: {
            external: ['@noeldemartin/utils', 'jsonld', 'md5', 'n3'],
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
