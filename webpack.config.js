const path = require('path');

const webpack = require('webpack');

const StringReplacePlugin = require('string-replace-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const pkg = require('./package.json');

function config(grunt) {
    const date = grunt.config.get('date');
    const dt = date.toISOString().replace(/T.*/, '');
    const year = date.getFullYear();
    return {
        mode: 'production',
        entry: {
            app: 'app',
            vendor: ['jquery', 'underscore', 'backbone', 'kdbxweb', 'baron',
                'pikaday', 'jsqrcode', 'argon2-wasm', 'argon2']
        },
        output: {
            path: path.resolve('.', 'tmp/js'),
            filename: '[name].js'
        },
        target: 'web',
        performance: {
            hints: false
        },
        stats: {
            colors: false,
            modules: true,
            reasons: true
        },
        progress: false,
        failOnError: true,
        resolve: {
            modules: [path.join(__dirname, 'app/scripts'), path.join(__dirname, 'node_modules')],
            alias: {
                backbone: 'backbone/backbone-min.js',
                underscore: 'underscore/underscore-min.js',
                _: 'underscore/underscore-min.js',
                jquery: 'jquery/dist/jquery.min.js',
                kdbxweb: 'kdbxweb/dist/kdbxweb.js',
                baron: 'baron/baron.min.js',
                pikaday: 'pikaday/pikaday.js',
                qrcode: 'jsqrcode/dist/qrcode.min.js',
                argon2: 'argon2-browser/dist/argon2.min.js',
                hbs: 'handlebars/runtime.js',
                'argon2-wasm': 'argon2-browser/dist/argon2.wasm',
                templates: path.join(__dirname, 'app/templates')
            }
        },
        module: {
            rules: [
                {
                    test: /\.hbs$/, loader: StringReplacePlugin.replace('handlebars-loader', {
                        replacements: [{ pattern: /\r?\n\s*/g, replacement: () => '\n' }]
                    })
                },
                {
                    test: /runtime-info\.js$/, loader: StringReplacePlugin.replace({
                        replacements: [
                            { pattern: /@@VERSION/g, replacement: () => pkg.version + (grunt.option('beta') ? '-beta' : '') },
                            { pattern: /@@BETA/g, replacement: () => grunt.option('beta') ? '1' : '' },
                            { pattern: /@@DATE/g, replacement: () => dt },
                            { pattern: /@@COMMIT/g, replacement: () => grunt.config.get('gitinfo.local.branch.current.shortSHA') }
                        ]
                    })
                },
                {test: /baron(\.min)?\.js$/, loader: 'exports-loader?baron; delete window.baron;'},
                {test: /pikaday\.js$/, loader: 'uglify-loader'},
                {test: /handlebars/, loader: 'strip-sourcemap-loader'},
                {
                    test: /\.js$/, exclude: /(node_modules)/, loader: 'babel-loader',
                    query: {presets: ['@babel/preset-env'], cacheDirectory: true}
                },
                {test: /argon2\.wasm/, type: 'javascript/auto', loader: 'base64-loader'},
                {test: /argon2(\.min)?\.js/, loader: 'raw-loader'},
                {test: /\.scss$/, loader: 'raw-loader'}
            ]
        },
        optimization: {
            runtimeChunk: 'single',
            splitChunks: {
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendor',
                        chunks: 'all'
                    }
                }
            },
            minimizer: [
                new UglifyJsPlugin({
                    cache: true,
                    parallel: true
                }),
                new BundleAnalyzerPlugin({
                    openAnalyzer: false,
                    analyzerMode: 'static',
                    reportFilename: '../stats/analyzer_report.html',
                    generateStatsFile: true,
                    statsFilename: '../stats/stats.json'
                })
            ]
        },
        plugins: [
            new webpack.BannerPlugin('keeweb v' + pkg.version + ', (c) ' + year + ' ' + pkg.author.name +
                ', opensource.org/licenses/' + pkg.license),
            new webpack.ProvidePlugin({_: 'underscore', $: 'jquery'}),
            new webpack.IgnorePlugin(/^(moment)$/),
            new StringReplacePlugin()
        ],
        node: {
            console: false,
            process: false,
            crypto: false,
            Buffer: false,
            __filename: false,
            __dirname: false,
            fs: false,
            setImmediate: false,
            path: false
        },
        externals: {
            xmldom: 'null',
            crypto: 'null',
            fs: 'null',
            path: 'null'
        }
    };
}

function devServerConfig(grunt) {
    const devServerConfig = config(grunt);
    Object.assign(devServerConfig, {
        mode: 'development',
        devtool: 'source-map'
    });
    Object.assign(devServerConfig.resolve.alias, {
        backbone: 'backbone/backbone.js',
        underscore: 'underscore/underscore.js',
        _: 'underscore/underscore.js',
        jquery: 'jquery/dist/jquery.js',
        baron: 'baron/baron.js',
        qrcode: 'jsqrcode/dist/qrcode.js',
        argon2: 'argon2-browser/dist/argon2.js'
    });
    return devServerConfig;
}

module.exports.config = config;
module.exports.devServerConfig = devServerConfig;
