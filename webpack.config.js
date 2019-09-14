const path = require('path');

const webpack = require('webpack');

const StringReplacePlugin = require('string-replace-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const pkg = require('./package.json');

process.noDeprecation = true; // for css loaders

function config(grunt, mode = 'production') {
    const devMode = mode === 'development';
    const date = grunt.config.get('date');
    const dt = date.toISOString().replace(/T.*/, '');
    const year = date.getFullYear();
    return {
        mode,
        entry: {
            app: ['babel-helpers', 'app', 'main.scss'],
            vendor: [
                'jquery',
                'underscore',
                'backbone',
                'kdbxweb',
                'baron',
                'pikaday',
                'jsqrcode',
                'argon2-wasm',
                'argon2',
                'marked'
            ]
        },
        output: {
            path: path.resolve('.', 'tmp'),
            filename: 'js/[name].js'
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
            modules: [
                path.join(__dirname, 'app/scripts'),
                path.join(__dirname, 'app/styles'),
                path.join(__dirname, 'node_modules')
            ],
            alias: {
                'babel-helpers': path.join(__dirname, 'app/lib/babel-helpers.js'),
                backbone: `backbone/backbone${devMode ? '-min' : ''}.js`,
                underscore: `underscore/underscore${devMode ? '-min' : ''}.js`,
                _: `underscore/underscore${devMode ? '-min' : ''}.js`,
                jquery: `jquery/dist/jquery${devMode ? '.min' : ''}.js`,
                kdbxweb: 'kdbxweb/dist/kdbxweb.js',
                baron: `baron/baron${devMode ? '.min' : ''}.js`,
                qrcode: `jsqrcode/dist/qrcode${devMode ? '.min' : ''}.js`,
                argon2: 'argon2-browser/dist/argon2.js',
                marked: devMode ? 'marked/lib/marked.js' : 'marked/marked.min.js',
                dompurify: `dompurify/dist/purify${devMode ? '.min' : ''}.js`,
                hbs: 'handlebars/runtime.js',
                'argon2-wasm': 'argon2-browser/dist/argon2.wasm',
                templates: path.join(__dirname, 'app/templates'),
                'public-key.pem': path.join(__dirname, 'app/resources/public-key.pem'),
                'demo.kdbx': path.join(__dirname, 'app/resources/Demo.kdbx')
            }
        },
        module: {
            rules: [
                {
                    test: /\.hbs$/,
                    loader: StringReplacePlugin.replace('handlebars-loader', {
                        replacements: [{ pattern: /\r?\n\s*/g, replacement: () => '\n' }]
                    })
                },
                {
                    test: /runtime-info\.js$/,
                    loader: StringReplacePlugin.replace({
                        replacements: [
                            {
                                pattern: /@@VERSION/g,
                                replacement: () =>
                                    pkg.version + (grunt.option('beta') ? '-beta' : '')
                            },
                            {
                                pattern: /@@BETA/g,
                                replacement: () => (grunt.option('beta') ? '1' : '')
                            },
                            { pattern: /@@DATE/g, replacement: () => dt },
                            {
                                pattern: /@@COMMIT/g,
                                replacement: () =>
                                    grunt.config.get('gitinfo.local.branch.current.shortSHA')
                            }
                        ]
                    })
                },
                {
                    test: /baron(\.min)?\.js$/,
                    loader: 'exports-loader?baron; delete window.baron;'
                },
                {
                    test: /babel-helpers\.js$/,
                    loader: 'exports-loader?global.babelHelpers; delete global.babelHelpers'
                },
                { test: /pikaday\.js$/, loader: 'uglify-loader' },
                { test: /handlebars/, loader: 'strip-sourcemap-loader' },
                {
                    test: /\.js$/,
                    exclude: /(node_modules|babel-helpers\.js)/,
                    loader: 'babel-loader',
                    query: { cacheDirectory: true }
                },
                { test: /argon2\.wasm/, type: 'javascript/auto', loader: 'base64-loader' },
                { test: /argon2(\.min)?\.js/, loader: 'raw-loader' },
                {
                    test: /\.s?css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        { loader: 'css-loader', options: { sourceMap: devMode } },
                        { loader: 'sass-loader', options: { sourceMap: devMode } }
                    ]
                },
                {
                    test: /fonts\/.*\.(woff2|ttf|eot|svg)/,
                    use: ['url-loader', 'ignore-loader']
                },
                { test: /\.woff$/, loader: 'url-loader' },
                { test: /\.pem$/, loader: 'raw-loader' },
                { test: /\.kdbx$/, loader: 'base64-loader' }
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
                new OptimizeCSSAssetsPlugin({
                    cssProcessorPluginOptions: {
                        preset: ['default', { discardComments: { removeAll: true } }]
                    }
                }),
                new BundleAnalyzerPlugin({
                    openAnalyzer: false,
                    analyzerMode: 'static',
                    reportFilename: 'stats/analyzer_report.html',
                    generateStatsFile: true,
                    statsFilename: 'stats/stats.json'
                })
            ]
        },
        plugins: [
            new webpack.BannerPlugin(
                'keeweb v' +
                    pkg.version +
                    ', (c) ' +
                    year +
                    ' ' +
                    pkg.author.name +
                    ', opensource.org/licenses/' +
                    pkg.license
            ),
            new webpack.ProvidePlugin({
                _: 'underscore',
                $: 'jquery',
                babelHelpers: 'babel-helpers'
            }),
            new webpack.IgnorePlugin(/^(moment)$/),
            new StringReplacePlugin(),
            new MiniCssExtractPlugin({
                filename: 'css/[name].css'
            })
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
        },
        devtool: devMode ? 'source-map' : undefined
    };
}

module.exports.config = config;
