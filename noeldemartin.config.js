const { defineConfig } = require('@noeldemartin/scripts');

module.exports = defineConfig({
    name: 'NoelDeMartinSolidUtils',
    declarations: [
        // 'src/plugins/cypress/types.d.ts',
        'src/plugins/jest/types.d.ts',
    ],
});
