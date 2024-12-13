/*
    Required Modules

    fs                  : filesystem
    moment              : datetime library
    uid                 : uuid v5
*/

const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const moment = require('moment');
const { v5: uid } = require('uuid');

/*
    Plugins
*/

const PluginBundleAnalyzer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const PluginMiniCssExtract = require('mini-css-extract-plugin');
const PluginMinimizeCss = require('css-minimizer-webpack-plugin');
const PluginTerser = require('terser-webpack-plugin');

/*
    Misc
*/

const pkg = require('../package.json');
const rootDir = path.join(__dirname, '..');
process.noDeprecation = true; // for css loaders

/*
    Module > Exports
*/

module.exports = function (options) {
    /*
        Build IDs

        guid        : should never change, based on repository url
        uuid        : changes with each new version based on version number
    */

    const kwGuid = uid(`${pkg.repository.url}`, uid.URL);
    const kwUuid = uid(pkg.version, kwGuid);

    const guid = options.guid || kwGuid;
    const uuid = options.uuid || kwUuid;

    /*
        Env mode
    */

    const mode = options.mode || 'production';
    const devMode = mode === 'development';

    /*
        Timestamps

        times based on UTC

        now             : Fri May 10 2024 19:35:54 GMT+0000
        nowYyyymmdd     : 2024-05-10
        nowYear         : 2024

        'options.date' can also come from test.webpack.config.js
    */

    const now = options.date || moment().utc();
    const nowYyyymmdd = moment(now).format('YYYY-MM-DD');
    const nowYear = moment(now).year();

    /*
        banner
    */

    const jsBanner = `
/*!
*    @name:        ${pkg.name} v${pkg.version}
*    @url:         ${pkg.repository.url}
*    @copyright:   (c) ${nowYear}
*    @license:     opensource.org/licenses/${pkg.license}
*    @build:       ${now}
*    @guid:        ${guid}
*    @uuid:        ${uuid}
*/
console.log("%c${pkg.name} Developer Console", "color:#7f6df2; font-size:30px; font-weight:bold;");
console.log("%cIf you have an issue with this app, copy the contents of this window and submit it to https://github.com/keeweb/keeweb/issues", "color:#ffffff; font-size:12px; font-weight:bold;");
console.log("%cNever do anything in this window if you are asked by someone outside of ${pkg.name} developers", "color:#ef1d53; font-size:12px; font-weight:bold;");
    `;

    return {
        mode,
        entry: {
            app: ['babel-helpers', 'app', 'main.scss']
        },
        output: {
            path: path.resolve('.', 'tmp'),
            publicPath: '',
            filename: 'js/[name].js'
        },
        target: 'web',
        performance: {
            hints: false
        },
        stats: {
            builtAt: false,
            env: false,
            hash: false,
            colors: true,
            modules: false,
            reasons: false,
            children: false,
            warnings: false,
            errorDetails: false,
            errorStack: false,
            errorsCount: false,
            logging: false, // false, 'none' | 'error' | 'warn' | 'info' | 'log' | 'verbose'
            loggingTrace: false,
            loggingDebug: ['sass', 'sass-loader']
        },
        progress: false,
        failOnError: true,
        resolve: {
            modules: [
                path.join(rootDir, 'app/scripts'),
                path.join(rootDir, 'app/styles'),
                path.join(rootDir, 'app/wallpapers'),
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
                tweetnacl: `tweetnacl/nacl${devMode ? '' : '.min'}.js`,
                hbs: 'handlebars/runtime.js',
                'argon2-wasm': 'argon2-browser/dist/argon2.wasm',
                templates: path.join(rootDir, 'app/templates'),
                'public-key.pem': path.join(rootDir, 'app/resources/public-key.pem'),
                'public-key-new.pem': path.join(rootDir, 'app/resources/public-key-new.pem'),
                'demo.kdbx': path.join(rootDir, 'app/resources/Demo.kdbx'),
                'fontawesome.woff2': path.resolve(
                    __dirname,
                    '../node_modules/@fortawesome/fontawesome-free/webfonts/fa-regular-400.woff2'
                ),
                'wallpaper1': path.join(rootDir, 'app/wallpapers/1.jpg'),
                'wallpaper2': path.join(rootDir, 'app/wallpapers/2.jpg'),
                'wallpaper3': path.join(rootDir, 'app/wallpapers/3.jpg'),
                'wallpaper4': path.join(rootDir, 'app/wallpapers/4.jpg')
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
        resolveLoader: {
            modules: ['node_modules', path.join(__dirname, 'loaders')]
        },
        module: {
            rules: [
                {
                    test: /\.hbs$/,
                    use: [
                        {
                            loader: 'handlebars-loader',
                            options: {
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
                        },
                        {
                            loader: 'string-replace-loader',
                            options: {
                                search: /\r?\n\s*/g,
                                replace: '\n'
                            }
                        }
                    ]
                },
                {
                    test: /runtime-info\.js$/,
                    loader: 'string-replace-loader',
                    options: {
                        multiple: [
                            {
                                search: /@@VERSION/g,
                                replace: pkg.version + (options.beta ? '-beta' : '')
                            },
                            {
                                search: /@@BETA/g,
                                replace: options.beta ? '1' : ''
                            },
                            { search: /@@DATE/g, replace: nowYyyymmdd },
                            { search: /@@GUID/g, replace: guid },
                            { search: /@@UUID/g, replace: uuid },
                            {
                                search: /@@COMMIT/g,
                                replace: options.sha
                            },
                            { search: /@@DEVMODE/g, replace: devMode ? '1' : '' },
                            { search: /@@APPLE_TEAM_ID/g, replace: options.appleTeamId }
                        ]
                    }
                },
                {
                    test: /baron(\.min)?\.js$/,
                    use: [
                        {
                            loader: 'string-replace-loader',
                            options: {
                                search: /\(1,\s*eval\)\('this'\)/g,
                                replace: 'window'
                            }
                        },
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
                    options: { cacheDirectory: true }
                },
                { test: /argon2\.wasm/, type: 'javascript/auto', loader: 'base64-loader' },
                { test: /argon2(\.min)?\.js/, loader: 'raw-loader' },
                {
                    test: /\.s?css$/,
                    use: [
                        PluginMiniCssExtract.loader,
                        {
                            // translates CSS into CommonJS
                            loader: 'css-loader',
                            options: {
                                esModule: false,
                                importLoaders: 2,
                                sourceMap: !devMode,
                                url: true,
                                import: true
                            }
                        },
                        {
                            // autoprefixing, linting and more
                            loader: 'postcss-loader',
                            options: {
                                sourceMap: !devMode
                            }
                        },
                        {
                            // compile Sass to CSS
                            loader: 'sass-loader',
                            options: {
                                sassOptions: {
                                    outputStyle: 'expanded',
                                    quietDeps: true,
                                    silenceDeprecations: [
                                        'import',
                                        'global-builtin',
                                        'legacy-js-api',
                                        'mixed-decls',
                                        'color-functions'
                                    ]
                                },
                                sourceMap: !devMode
                            }
                        },
                        {
                            loader: 'scss-add-icons-loader'
                        }
                    ]
                },
                {
                    test: /\.(svg|png|jpe?g|gif)$/,
                    loader: 'file-loader',
                    options: {
                        name: 'wallpapers/[name].[ext]'
                    }
                },
                {
                    test: /\.(svg|png|jpe?g|gif)$/,
                    include: [path.resolve(__dirname, 'app/wallpapers/')],
                    type: 'asset/resource',
                    generator: {
                        filename: '[name][ext]'
                    }
                },
                { test: /fontawesome.*\.woff2$/, loader: 'fontawesome-loader' },
                { test: /\.pem$/, loader: 'raw-loader' },
                { test: /\.kdbx$/, loader: 'base64-loader' }
            ]
        },
        optimization: {
            runtimeChunk: false,
            minimize: !devMode, // set true to minimize in dev + production mode
            minimizer: [
                new PluginTerser({
                    minify: PluginTerser.terserMinify,
                    extractComments: 'never-extract-comments',
                    terserOptions: {
                        ecma: 6
                    }
                }),
                new PluginMinimizeCss({
                    test: /\.min\.css$/i,
                    minimizerOptions: {
                        preset: [
                            'default',
                            {
                                discardComments: { removeAll: true }
                            }
                        ]
                    }
                }),
                new PluginBundleAnalyzer({
                    openAnalyzer: false,
                    analyzerMode: 'static',
                    reportFilename: 'stats/analyzer_report.html',
                    generateStatsFile: true,
                    statsFilename: 'stats/stats.json'
                })
            ]
        },
        plugins: [
            new webpack.BannerPlugin({
                entryOnly: true,
                raw: true,
                banner: jsBanner
            }),
            new webpack.ProvidePlugin({
                $: 'jquery',
                babelHelpers: 'babel-helpers'
            }),
            new webpack.ProvidePlugin({ process: 'process/browser' }),
            new webpack.IgnorePlugin({ resourceRegExp: /^(moment)$/ }),
            new PluginMiniCssExtract({
                filename: 'css/[name].css'
            })
        ],
        node: {
            __filename: false,
            __dirname: false
        },
        externals: {
            xmldom: 'null',
            crypto: 'null',
            fs: 'null',
            path: 'null'
        },
        devtool: devMode ? 'source-map' : undefined
    };
};
