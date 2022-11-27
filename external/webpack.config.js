const path = require('path');

module.exports = {
    entry: path.resolve(__dirname, './tmp/main.js'),
    mode: 'production',
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: 'solid-utils-external.umd.js',
        library: 'NoelDeMartinSolidUtilsExternals',
        libraryTarget: 'umd',
    },
};
