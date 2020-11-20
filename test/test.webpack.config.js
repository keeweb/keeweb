const path = require('path');
const webpackConfig = require('../build/webpack.config');

const appConfig = webpackConfig.config({
    mode: 'development',
    date: new Date(),
    sha: 'tests'
});

const rootDir = path.join(__dirname, '..');

module.exports = {
    mode: 'development',
    devtool: 'source-map',
    entry: path.resolve(__dirname, 'index.js'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'test.bundle.js'
    },
    resolve: {
        modules: appConfig.resolve.modules,
        alias: {
            ...appConfig.resolve.alias,
            test: path.resolve(rootDir, 'test')
        },
        fallback: {
            console: false,
            process: false,
            crypto: false,
            Buffer: false,
            __filename: false,
            __dirname: false,
            fs: false,
            setImmediate: false,
            path: false,
            moment: false
        }
    },
    module: {
        rules: appConfig.module.rules
    }
};
