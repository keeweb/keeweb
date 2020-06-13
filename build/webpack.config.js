const path = require('path');
const fs = require('fs');

const webpack = require('webpack');

const StringReplacePlugin = require('string-replace-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const rootDir = path.join(__dirname, '..');

const pkg = require('../package.json');

process.noDeprecation = true; // for css loaders

function config(options) {
    const mode = options.mode || 'production';
    const devMode = mode === 'development';
    const date = options.date;
    const dt = date.toISOString().replace(/T.*/, '');
    const year = date.getFullYear();
    return {
        mode,
        entry: {
            app: ['babel-helpers', 'app', 'main.scss'],
            vendor: [
                'jquery',
                'morphdom',
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
                path.join(rootDir, 'app/scripts'),
                path.join(rootDir, 'app/styles'),
                path.join(rootDir, 'node_modules')
            ],
            alias: {
                'babel-helpers': path.join(rootDir, 'app/lib/babel-helpers.js'),
                jquery: `jquery/dist/jquery${devMode ? '' : '.min'}.js`,
                morphdom: `morphdom/dist/morphdom-umd${devMode ? '' : '.min'}.js`,
                kdbxweb: `kdbxweb/dist/kdbxweb${devMode ? '' : '.min'}.js`,
                baron: `baron/baron${devMode ? '' : '.min'}.js`,
                qrcode: `jsqrcode/dist/qrcode${devMode ? '' : '.min'}.js`,
                argon2: 'argon2-browser/dist/argon2.js',
                marked: devMode ? 'marked/lib/marked.js' : 'marked/marked.min.js',
                dompurify: `dompurify/dist/purify${devMode ? '' : '.min'}.js`,
                hbs: 'handlebars/runtime.js',
                'argon2-wasm': 'argon2-browser/dist/argon2.wasm',
                templates: path.join(rootDir, 'app/templates'),
                'public-key.pem': path.join(rootDir, 'app/resources/public-key.pem'),
                'public-key-new.pem': path.join(rootDir, 'app/resources/public-key-new.pem'),
                'demo.kdbx': path.join(rootDir, 'app/resources/Demo.kdbx'),
                svg: path.join(rootDir, 'app/resources/svg')
            }
        },
        module: {
            rules: [
                {
                    test: /\.hbs$/,
                    use: [
                        StringReplacePlugin.replace({
                            replacements: [{ pattern: /\r?\n\s*/g, replacement: () => '\n' }]
                        }),
                        {
                            loader: 'handlebars-loader',
                            query: {
                                knownHelpers: fs
                                    .readdirSync(path.join(rootDir, 'app/scripts/hbs-helpers'))
                                    .map((f) => f.replace('.js', ''))
                                    .filter((f) => f !== 'index'),
                                partialResolver(partial, callback) {
                                    const location = path.join(
                                        rootDir,
                                        'app/templates/partials',
                                        `${partial}.hbs`
                                    );
                                    callback(null, location);
                                }
                            }
                        }
                    ]
                },
                {
                    test: /runtime-info\.js$/,
                    loader: StringReplacePlugin.replace({
                        replacements: [
                            {
                                pattern: /@@VERSION/g,
                                replacement: () => pkg.version + (options.beta ? '-beta' : '')
                            },
                            {
                                pattern: /@@BETA/g,
                                replacement: () => (options.beta ? '1' : '')
                            },
                            { pattern: /@@DATE/g, replacement: () => dt },
                            {
                                pattern: /@@COMMIT/g,
                                replacement: () => options.sha
                            },
                            { pattern: /@@DEVMODE/g, replacement: () => (devMode ? '1' : '') }
                        ]
                    })
                },
                {
                    test: /baron(\.min)?\.js$/,
                    use: [
                        StringReplacePlugin.replace({
                            replacements: [
                                { pattern: /\(1,\s*eval\)\('this'\)/g, replacement: () => 'window' }
                            ]
                        }),
                        {
                            loader: 'exports-loader',
                            options: { type: 'module', exports: 'default baron' }
                        }
                    ]
                },
                {
                    test: /babel-helpers\.js$/,
                    loader: 'exports-loader',
                    options: { type: 'module', exports: 'default babelHelpers' }
                },
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
                        { loader: 'postcss-loader', options: { sourceMap: devMode } },
                        { loader: 'sass-loader', options: { sourceMap: devMode } }
                    ]
                },
                {
                    test: /fonts[\\/].*\.(woff|ttf|eot|svg)$/,
                    use: ['base64-inline-loader', 'ignore-loader']
                },
                { test: /\.woff2$/, loader: 'base64-inline-loader' },
                { test: /\.pem$/, loader: 'raw-loader' },
                { test: /\.kdbx$/, loader: 'base64-loader' },
                { test: /\.svg$/, loader: 'raw-loader' }
            ]
        },
        optimization: {
            runtimeChunk: 'single',
            minimize: !devMode,
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
                new TerserPlugin({
                    extractComments: 'never-extract-comments',
                    terserOptions: {
                        ecma: 6
                    }
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
