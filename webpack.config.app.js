const path = require('path');
const webpack = require('webpack');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const StringReplacePlugin = require('string-replace-webpack-plugin');
const GitRevisionPlugin = require('git-revision-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const IgnoreAssetsWebpackPlugin = require('ignore-assets-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const pkg = require('./package.json');

const dt = new Date().toISOString().replace(/T.*/, '');
const minElectronVersionForUpdate = '1.7.0';
const year = new Date().getFullYear();
const gitRevisionPlugin = new GitRevisionPlugin({
    commithashCommand: 'rev-parse --short HEAD'
});
const shortSHA = gitRevisionPlugin.commithash();

const production = process.env.NODE_ENV === 'production';

const defaultEnv = {
    target: 'web',
    release: 'stable',
    stats: false
};

module.exports = (env = defaultEnv, argv = {}) => ({
    mode: production ? 'production' : 'development',
    entry: {
        app: 'app',
        vendor: ['jquery', 'underscore', 'backbone', 'kdbxweb', 'baron', 'pikaday', 'file-saver', 'jsqrcode', 'argon2-wasm', 'argon2']
    },
    output: {
        path: path.resolve(__dirname, 'dist', 'app'),
        filename: 'js/[name].js'
    },
    target: env.target === 'desktop' ? 'electron-renderer' : 'web',
    performance: {
        hints: production ? 'warning' : false
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist', 'app'),
        port: 8085
    },
    resolve: {
        modules: [path.join(__dirname, 'app/scripts'), path.join(__dirname, 'node_modules')],
        alias: {
            hbs: 'handlebars/runtime.js',
            'argon2': 'argon2-browser/dist/argon2.min.js',
            'argon2-wasm': 'argon2-browser/dist/argon2.wasm',
            templates: path.join(__dirname, 'app/templates')
        }
    },
    module: {
        rules: [
            { test: /\.hbs$/, loader: 'handlebars-loader' },
            {
                test: /runtime-info\.js$/,
                loader: StringReplacePlugin.replace({
                    replacements: [
                        { pattern: /@@VERSION/g, replacement: () => pkg.version + (env.release === 'beta' ? '-beta' : '') },
                        { pattern: /@@BETA/g, replacement: () => env.release === 'beta' ? '1' : '' },
                        { pattern: /@@DATE/g, replacement: () => dt },
                        { pattern: /@@COMMIT/g, replacement: () => shortSHA }
                    ]
                })
            },
            { test: /handlebars/, loader: 'strip-sourcemap-loader' },
            //  embedded .woff font file
            { test: /\.woff$/, loader: 'url-loader' },
            //  ignore other types of font file
            { test: /\.(woff2|ttf|eot|svg)$/, use: ['raw-loader', 'ignore-loader'] },
            //  load argon2 wasm file as a base64 string
            { test: /argon2\.wasm$/, type: 'javascript/auto', loader: 'base64-loader' },
            //  `argon2.min.js` should be load as a string
            { test: /argon2\.min\.js$/, loader: 'raw-loader' },
            {
                enforce: 'pre',
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'eslint-loader',
                options: {
                    failOnError: true
                }
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['env'],
                    cacheDirectory: true
                }
            },
            {
                test: /\.(scss|sass|css)$/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: [
                        {
                            loader: 'css-loader',
                            options: {
                                sourceMap: true,
                                minimize: {
                                    discardComments: {
                                        removeAll: true
                                    }
                                }
                            }
                        },
                        'resolve-url-loader',
                        'sass-loader?sourceMap'
                    ]
                })
            }
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
            new OptimizeCSSAssetsPlugin(),
            new IgnoreAssetsWebpackPlugin({ ignore: 'main.css' }),
            new HtmlWebpackInlineSourcePlugin(),
            //  BundlerAnalyzer will be empty if ScriptExtHtmlWebpackPlugin is applied, so they are mutual exclusive.
            ...(env.stats ? [
                new BundleAnalyzerPlugin({
                    analyzerMode: 'static',
                    reportFilename: '../tmp/analyzer_report.html'
                })
            ] : [
                new ScriptExtHtmlWebpackPlugin({ inline: /\.js$/ })
            ])
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            favicon: 'app/favicon.png',
            template: 'app/index.hbs',
            templateParameters: {
                web: env.target === 'web',
                cordova: env.target === 'cordova'
            },
            inlineSource: '.(css)$',
            minify: production ? {
                removeComments: true,
                collapseWhitespace: true
            } : false
        }),
        // We only need 'manifest', 'icons' on Web.
        new CopyWebpackPlugin(env.target === 'web' ? [
            {
                from: 'app/manifest.appcache',
                transform(content) {
                    return String(content)
                    .replace('YYYY-MM-DD:v0.0.0', dt + ':v' + pkg.version)
                    .replace('updmin:v0.0.0', 'updmin:v' + minElectronVersionForUpdate);
                }
            },
            {
                from: 'app/icons/*.+(png|svg)',
                to: 'icons/[name].[ext]'
            },
            {
                from: 'app/manifest/*.+(xml|json)',
                to: '[name].[ext]'
            }
        ] : [], {debug: true}),
        new webpack.BannerPlugin('keeweb v' + pkg.version + ', (c) ' + year + ' ' + pkg.author.name + ', opensource.org/licenses/' + pkg.license),
        new webpack.ProvidePlugin({
            _: 'underscore',
            $: 'jquery'
        }),
        new webpack.IgnorePlugin(/^(moment)$/),
        new StringReplacePlugin(),
        new ExtractTextPlugin('main.css')
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
});
