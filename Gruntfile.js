/* eslint-env node */

const fs = require('fs');
const path = require('path');

const StringReplacePlugin = require('string-replace-webpack-plugin');
const StatsPlugin = require('stats-webpack-plugin');

module.exports = function(grunt) {
    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);
    grunt.loadTasks('grunt/tasks');

    const webpack = require('webpack');
    const pkg = require('./package.json');
    const dt = new Date().toISOString().replace(/T.*/, '');
    const minElectronVersionForUpdate = '1.0.1';
    const zipCommentPlaceholderPart = 'zip_comment_placeholder_that_will_be_replaced_with_hash';
    const zipCommentPlaceholder = zipCommentPlaceholderPart + '.'.repeat(512 - zipCommentPlaceholderPart.length);
    const electronVersion = pkg.devDependencies['electron'].replace(/^\D/, '');
    const year = new Date().getFullYear();

    function replaceFont(css) {
        css.walkAtRules('font-face', rule => {
            const fontFamily = rule.nodes.filter(n => n.prop === 'font-family')[0];
            if (!fontFamily) {
                throw 'Bad font rule: ' + rule.toString();
            }
            const value = fontFamily.value.replace(/["']/g, '');
            const fontFiles = {
                FontAwesome: 'fontawesome-webfont.woff'
            };
            const fontFile = fontFiles[value];
            if (!fontFile) {
                throw 'Unsupported font ' + value + ': ' + rule.toString();
            }
            const data = fs.readFileSync('tmp/fonts/' + fontFile, 'base64');
            const src = 'url(data:application/font-woff;charset=utf-8;base64,{data}) format(\'woff\')'
                .replace('{data}', data);
            rule.nodes = rule.nodes.filter(n => n.prop !== 'src');
            rule.append({ prop: 'src', value: src });
        });
    }

    const webpackConfig = {
        entry: {
            app: 'app',
            vendor: ['jquery', 'underscore', 'backbone', 'kdbxweb', 'baron', 'pikaday', 'filesaver', 'qrcode',
                'argon2-asm', 'argon2-wasm', 'argon2']
        },
        output: {
            path: path.resolve('.', 'tmp/js'),
            filename: 'app.js'
        },
        stats: {
            colors: false,
            modules: true,
            reasons: true
        },
        progress: false,
        failOnError: true,
        resolve: {
            modules: [path.join(__dirname, 'app/scripts'), path.join(__dirname, 'bower_components')],
            alias: {
                backbone: 'backbone/backbone-min.js',
                underscore: 'underscore/underscore-min.js',
                _: 'underscore/underscore-min.js',
                jquery: 'jquery/dist/jquery.min.js',
                hbs: path.resolve(__dirname, 'node_modules', 'handlebars/runtime.js'),
                kdbxweb: 'kdbxweb/dist/kdbxweb.js',
                baron: 'baron/baron.min.js',
                pikaday: 'pikaday/pikaday.js',
                filesaver: 'FileSaver.js/FileSaver.min.js',
                qrcode: 'jsqrcode/dist/qrcode.min.js',
                'argon2-asm': 'argon2-browser/docs/dist/argon2-asm.min.js',
                'argon2-wasm': 'argon2-browser/docs/dist/argon2.wasm',
                'argon2': 'argon2-browser/docs/dist/argon2.min.js',
                templates: path.join(__dirname, 'app/templates')
            }
        },
        module: {
            loaders: [
                { test: /\.hbs$/, loader: StringReplacePlugin.replace('handlebars-loader', { replacements: [{
                    pattern: /\r?\n\s*/g,
                    replacement: function() { return '\n'; }
                }]})},
                { test: /runtime-info\.js$/, loader: StringReplacePlugin.replace({ replacements: [
                    { pattern: /@@VERSION/g, replacement: function() { return pkg.version; } },
                    { pattern: /@@DATE/g, replacement: function() { return dt; } },
                    { pattern: /@@COMMIT/g, replacement: function() { return grunt.config.get('gitinfo.local.branch.current.shortSHA'); } }
                ]})},
                { test: /baron(\.min)?\.js$/, loader: 'exports-loader?baron; delete window.baron;' },
                { test: /pikaday\.js$/, loader: 'uglify-loader' },
                { test: /handlebars/, loader: 'strip-sourcemap-loader' },
                { test: /\.js$/, exclude: /(node_modules|bower_components)/, loader: 'babel-loader',
                    query: { presets: ['es2015'], cacheDirectory: true }
                },
                { test: /\.json$/, loader: 'json-loader' },
                { test: /argon2-asm\.min\.js$/, loader: 'raw-loader' },
                { test: /argon2\.wasm$/, loader: 'base64-loader' },
                { test: /argon2\.min\.js/, loader: 'raw-loader' },
                { test: /\.scss$/, loader: 'raw-loader' }
            ]
        },
        plugins: [
            new webpack.optimize.CommonsChunkPlugin({ name: 'vendor', minChunks: Infinity, filename: 'vendor.js' }),
            new webpack.BannerPlugin('keeweb v' + pkg.version + ', (c) ' + year + ' ' + pkg.author.name +
                ', opensource.org/licenses/' + pkg.license),
            new webpack.ProvidePlugin({ _: 'underscore', $: 'jquery' }),
            new webpack.IgnorePlugin(/^(moment)$/),
            new StringReplacePlugin(),
            new StatsPlugin('stats.json', { chunkModules: true })
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

    grunt.initConfig({
        gitinfo: {
            branch: {
                current: {
                    SHA: 'Current HEAD SHA',
                    shortSHA: 'Current HEAD short SHA',
                    name: 'Current branch name',
                    lastCommitTime: 'Last commit time'
                }
            }
        },
        'bower-install-simple': {
            install: {
            }
        },
        clean: {
            dist: ['dist', 'tmp'],
            desktop: ['tmp/desktop', 'dist/desktop'],
            cordova: ['tmp/cordova', 'dist/cordova']
        },
        copy: {
            html: {
                src: 'app/index.html',
                dest: 'tmp/index.html',
                nonull: true
            },
            favicon: {
                src: 'app/favicon.png',
                dest: 'tmp/favicon.png',
                nonull: true
            },
            touchicon: {
                src: 'app/touchicon.png',
                dest: 'tmp/touchicon.png',
                nonull: true
            },
            fonts: {
                src: 'bower_components/font-awesome/fonts/fontawesome-webfont.*',
                dest: 'tmp/fonts/',
                nonull: true,
                expand: true,
                flatten: true
            },
            'desktop-app-content': {
                cwd: 'desktop/',
                src: '**',
                dest: 'tmp/desktop/app/',
                expand: true,
                nonull: true
            },
            'desktop-update': {
                cwd: 'tmp/desktop/app/',
                src: '**',
                dest: 'tmp/desktop/update/',
                expand: true,
                nonull: true
            },
            'desktop-update-helper': {
                src: ['helper/darwin/KeeWebHelper', 'helper/win32/KeeWebHelper.exe'],
                dest: 'tmp/desktop/update/',
                nonull: true
            },
            'desktop-windows-helper-ia32': {
                src: 'helper/win32/KeeWebHelper.exe',
                dest: 'tmp/desktop/KeeWeb-win32-ia32/resources/app/',
                nonull: true
            },
            'desktop-windows-helper-x64': {
                src: 'helper/win32/KeeWebHelper.exe',
                dest: 'tmp/desktop/KeeWeb-win32-x64/resources/app/',
                nonull: true
            },
            'desktop-darwin-helper-x64': {
                src: 'helper/darwin/KeeWebHelper',
                dest: 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app/Contents/Resources/app/',
                nonull: true,
                options: { mode: '0755' }
            },
            'desktop-win32-dist-x64': {
                src: 'tmp/desktop/KeeWeb.win.x64.exe',
                dest: `dist/desktop/KeeWeb-${pkg.version}.win.x64.exe`,
                nonull: true
            },
            'desktop-win32-dist-ia32': {
                src: 'tmp/desktop/KeeWeb.win.ia32.exe',
                dest: `dist/desktop/KeeWeb-${pkg.version}.win.ia32.exe`,
                nonull: true
            }
        },
        eslint: {
            app: ['app/scripts/**/*.js'],
            desktop: ['desktop/**/*.js', '!desktop/node_modules/**'],
            grunt: ['Gruntfile.js', 'grunt/**/*.js']
        },
        sass: {
            options: {
                sourceMap: false,
                includePaths: ['./bower_components']
            },
            dist: {
                files: {
                    'tmp/css/main.css': 'app/styles/main.scss'
                }
            }
        },
        postcss: {
            options: {
                processors: [
                    replaceFont,
                    require('cssnano')({discardComments: {removeAll: true}})
                ]
            },
            dist: {
                src: 'tmp/css/main.css',
                dest: 'tmp/css/main.css'
            }
        },
        inline: {
            app: {
                src: 'tmp/index.html',
                dest: 'tmp/app.html'
            }
        },
        htmlmin: {
            options: {
                removeComments: true,
                collapseWhitespace: true
            },
            app: {
                files: {
                    'dist/index.html': 'tmp/app.html'
                }
            }
        },
        'string-replace': {
            manifest: {
                options: {
                    replacements: [
                        { pattern: '# YYYY-MM-DD:v0.0.0', replacement: '# ' + dt + ':v' + pkg.version },
                        { pattern: '# updmin:v0.0.0', replacement: '# updmin:v' + minElectronVersionForUpdate }
                    ]
                },
                files: { 'dist/manifest.appcache': 'app/manifest.appcache' }
            },
            'manifest-html': {
                options: { replacements: [{ pattern: '<html', replacement: '<html manifest="manifest.appcache"' }] },
                files: { 'dist/index.html': 'dist/index.html' }
            },
            'desktop-html': {
                options: { replacements: [{ pattern: ' manifest="manifest.appcache"', replacement: '' }] },
                files: { 'tmp/desktop/app/index.html': 'dist/index.html' }
            },
            'cordova-html': {
                options: { replacements: [{ pattern: '<script', replacement: '<script src="cordova.js"></script><script' }] },
                files: { 'tmp/cordova/app/index.html': 'dist/index.html' }
            }
        },
        webpack: {
            js: webpackConfig
        },
        'webpack-dev-server': {
            options: {
                webpack: webpackConfig,
                publicPath: '/tmp/js',
                progress: false
            },
            js: {
                keepalive: true,
                webpack: {
                    devtool: 'source-map'
                },
                port: 8085
            }
        },
        uglify: {
            options: {
                preserveComments: false
            },
            app: {
                files: { 'tmp/js/app.js': ['tmp/js/app.js'] }
            },
            vendor: {
                options: {
                    mangle: false,
                    compress: false
                },
                files: { 'tmp/js/vendor.js': ['tmp/js/vendor.js'] }
            }
        },
        watch: {
            options: {
                interrupt: true,
                debounceDelay: 500
            },
            styles: {
                files: 'app/styles/**/*.scss',
                tasks: ['sass']
            },
            indexhtml: {
                files: 'app/index.html',
                tasks: ['copy:html']
            }
        },
        electron: {
            options: {
                name: 'KeeWeb',
                dir: 'tmp/desktop/app',
                out: 'tmp/desktop',
                electronVersion: electronVersion,
                overwrite: true,
                'app-copyright': `Copyright © ${year} Antelle`,
                'app-version': pkg.version,
                'build-version': '<%= gitinfo.local.branch.current.shortSHA %>'
            },
            linux: {
                options: {
                    platform: 'linux',
                    arch: ['x64', 'ia32'],
                    icon: 'graphics/icon.ico'
                }
            },
            darwin: {
                options: {
                    platform: 'darwin',
                    arch: ['x64'],
                    icon: 'graphics/icon.icns',
                    'app-bundle-id': 'net.antelle.keeweb',
                    'app-category-type': 'public.app-category.productivity',
                    'extend-info': 'package/osx/extend.plist'
                }
            },
            win32: {
                options: {
                    platform: 'win32',
                    arch: ['ia32', 'x64'],
                    icon: 'graphics/icon.ico',
                    'build-version': pkg.version,
                    'version-string': {
                        'CompanyName': 'KeeWeb',
                        'FileDescription': pkg.description,
                        'OriginalFilename': 'KeeWeb.exe',
                        'ProductName': 'KeeWeb',
                        'InternalName': 'KeeWeb'
                    }
                }
            }
        },
        codesign: {
            app: {
                options: {
                    identity: 'app',
                    deep: true
                },
                src: ['tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app']
            },
            dmg: {
                options: {
                    identity: 'app'
                },
                src: [`dist/desktop/KeeWeb-${pkg.version}.mac.dmg`]
            }
        },
        compress: {
            options: {
                level: 6
            },
            'desktop-update': {
                options: { archive: 'dist/desktop/UpdateDesktop.zip', comment: zipCommentPlaceholder },
                files: [
                    { cwd: 'tmp/desktop/update', src: '**', expand: true, nonull: true }
                ]
            },
            'win32-x64': {
                options: { archive: `dist/desktop/KeeWeb-${pkg.version}.win.x64.zip` },
                files: [{ cwd: 'tmp/desktop/KeeWeb-win32-x64', src: '**', expand: true }]
            },
            'win32-ia32': {
                options: { archive: `dist/desktop/KeeWeb-${pkg.version}.win.ia32.zip` },
                files: [{ cwd: 'tmp/desktop/KeeWeb-win32-ia32', src: '**', expand: true }]
            },
            'linux-x64': {
                options: { archive: `dist/desktop/KeeWeb-${pkg.version}.linux.x64.zip` },
                files: [{ cwd: 'tmp/desktop/KeeWeb-linux-x64', src: '**', expand: true }]
            },
            'linux-ia32': {
                options: { archive: `dist/desktop/KeeWeb-${pkg.version}.linux.ia32.zip` },
                files: [{ cwd: 'tmp/desktop/KeeWeb-linux-ia32', src: '**', expand: true }]
            }
        },
        appdmg: {
            options: {
                title: 'KeeWeb',
                icon: 'graphics/icon.icns',
                background: 'graphics/background.png',
                'background-color': '#E0E6F9',
                'icon-size': 80,
                window: { size: { width: 658, height: 498 } },
                contents: [
                    { x: 438, y: 344, type: 'link', path: '/Applications' },
                    { x: 192, y: 344, type: 'file', path: 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app' }
                ]
            },
            app: {
                dest: `dist/desktop/KeeWeb-${pkg.version}.mac.dmg`
            }
        },
        nsis: {
            options: {
                vars: {
                    version: pkg.version,
                    rev: function() { return grunt.config.get('gitinfo.local.branch.current.shortSHA'); },
                    homepage: pkg.homepage
                }
            },
            'win32-x64': {
                options: {
                    installScript: 'package/nsis/main.nsi',
                    arch: 'x64',
                    output: 'tmp/desktop/KeeWeb.win.x64.exe'
                }
            },
            'win32-un-x64': {
                options: {
                    installScript: 'package/nsis/main-un.nsi',
                    arch: 'x64',
                    output: 'tmp/desktop/KeeWeb-win32-x64/uninst.exe'
                }
            },
            'win32-ia32': {
                options: {
                    installScript: 'package/nsis/main.nsi',
                    arch: 'ia32',
                    output: 'tmp/desktop/KeeWeb.win.ia32.exe'
                }
            },
            'win32-un-ia32': {
                options: {
                    installScript: 'package/nsis/main-un.nsi',
                    arch: 'ia32',
                    output: 'tmp/desktop/KeeWeb-win32-ia32/uninst.exe'
                }
            }
        },
        deb: {
            options: {
                tmpPath: 'tmp/desktop/',
                package: {
                    name: 'keeweb-desktop',
                    version: pkg.version,
                    description: pkg.description,
                    author: pkg.author,
                    homepage: pkg.homepage,
                    rev: function() { return grunt.config.get('gitinfo.local.branch.current.shortSHA'); }
                }
            },
            'linux-x64': {
                options: {
                    info: {
                        arch: 'amd64',
                        pkgName: `KeeWeb-${pkg.version}.linux.x64.deb`,
                        targetDir: 'dist/desktop',
                        appName: 'KeeWeb',
                        depends: 'libappindicator1, libgconf2-4',
                        scripts: {
                            postinst: 'package/deb/scripts/postinst'
                        }
                    }
                },
                files: [
                    { cwd: 'package/deb/usr', src: '**', dest: '/usr', expand: true, nonull: true },
                    { cwd: 'tmp/desktop/KeeWeb-linux-x64/', src: '**', dest: '/opt/keeweb-desktop', expand: true, nonull: true },
                    { src: 'graphics/128x128.png', dest: '/usr/share/icons/hicolor/128x128/apps/keeweb.png', nonull: true }
                ]
            },
            'linux-ia32': {
                options: {
                    info: {
                        arch: 'i386',
                        pkgName: `KeeWeb-${pkg.version}.linux.ia32.deb`,
                        targetDir: 'dist/desktop',
                        appName: 'KeeWeb',
                        depends: 'libappindicator1, libgconf2-4',
                        scripts: {
                            postinst: 'package/deb/scripts/postinst'
                        }
                    }
                },
                files: [
                    { cwd: 'package/deb/usr', src: '**', dest: '/usr', expand: true, nonull: true },
                    { cwd: 'tmp/desktop/KeeWeb-linux-ia32/', src: '**', dest: '/opt/keeweb-desktop', expand: true, nonull: true },
                    { src: 'graphics/128x128.png', dest: '/usr/share/icons/hicolor/128x128/apps/keeweb.png', nonull: true }
                ]
            }
        },
        'sign-archive': {
            'desktop-update': {
                options: {
                    file: 'dist/desktop/UpdateDesktop.zip',
                    signature: zipCommentPlaceholder,
                    privateKey: 'keys/private-key.pem'
                }
            }
        },
        'sign-desktop-files': {
            'desktop-update': {
                options: {
                    path: 'tmp/desktop/update',
                    privateKey: 'keys/private-key.pem'
                }
            }
        },
        'validate-desktop-update': {
            desktop: {
                options: {
                    file: 'dist/desktop/UpdateDesktop.zip',
                    expected: [
                        'main.js', 'app.js', 'index.html', 'package.json', 'icon.png',
                        'node_modules/node-stream-zip/node_stream_zip.js',
                        'helper/darwin/KeeWebHelper',
                        'helper/win32/KeeWebHelper.exe'
                    ],
                    expectedCount: 16,
                    publicKey: 'app/resources/public-key.pem'
                }
            }
        },
        'sign-html': {
            'app': {
                options: {
                    file: 'dist/index.html',
                    privateKey: 'keys/private-key.pem'
                }
            }
        },
        'sign-exe': {
            options: {
                spc: 'keys/code-sign-win32.spc',
                pvk: 'keys/code-sign-win32.pvk',
                algo: 'sha1',
                url: pkg.homepage,
                keytarPasswordService: 'code-sign-win32-keeweb',
                keytarPasswordAccount: 'code-sign-win32-keeweb'
            },
            'win32-build-x64': {
                options: {
                    files: {
                        'tmp/desktop/KeeWeb-win32-x64/KeeWeb.exe': 'KeeWeb',
                        'tmp/desktop/KeeWeb-win32-x64/ffmpeg.dll': '',
                        'tmp/desktop/KeeWeb-win32-x64/libEGL.dll': 'ANGLE libEGL Dynamic Link Library',
                        'tmp/desktop/KeeWeb-win32-x64/libGLESv2.dll': 'ANGLE libGLESv2 Dynamic Link Library',
                        'tmp/desktop/KeeWeb-win32-x64/node.dll': 'Node.js'
                    }
                }
            },
            'win32-build-ia32': {
                options: {
                    files: {
                        'tmp/desktop/KeeWeb-win32-ia32/KeeWeb.exe': 'KeeWeb',
                        'tmp/desktop/KeeWeb-win32-ia32/ffmpeg.dll': '',
                        'tmp/desktop/KeeWeb-win32-ia32/libEGL.dll': 'ANGLE libEGL Dynamic Link Library',
                        'tmp/desktop/KeeWeb-win32-ia32/libGLESv2.dll': 'ANGLE libGLESv2 Dynamic Link Library',
                        'tmp/desktop/KeeWeb-win32-ia32/node.dll': 'Node.js'
                    }
                }
            },
            'win32-uninst-x64': {
                options: {
                    files: {
                        'tmp/desktop/KeeWeb-win32-x64/uninst.exe': 'KeeWeb Uninstaller'
                    }
                }
            },
            'win32-uninst-ia32': {
                options: {
                    files: {
                        'tmp/desktop/KeeWeb-win32-ia32/uninst.exe': 'KeeWeb Uninstaller'
                    }
                }
            },
            'win32-installer-x64': {
                options: {
                    files: {
                        'tmp/desktop/KeeWeb.win.x64.exe': 'KeeWeb Setup'
                    }
                }
            },
            'win32-installer-ia32': {
                options: {
                    files: {
                        'tmp/desktop/KeeWeb.win.ia32.exe': 'KeeWeb Setup'
                    }
                }
            }
        },
        'concurrent': {
            options: {
                logConcurrentOutput: true
            },
            'dev-server': [
                'watch:styles',
                'webpack-dev-server'
            ]
        },
        'sign-dist': {
            'dist': {
                options: {
                    sign: 'dist/desktop/Verify.sign.sha256',
                    privateKey: 'keys/private-key.pem'
                },
                files: {
                    'dist/desktop/Verify.sha256': ['dist/desktop/KeeWeb-*', 'dist/desktop/UpdateDesktop.zip']
                }
            }
        }
    });

    // compound builder tasks

    grunt.registerTask('build-web-app', [
        'gitinfo',
        'bower-install-simple',
        'clean',
        'eslint',
        'copy:html',
        'copy:favicon',
        'copy:touchicon',
        'copy:fonts',
        'webpack',
        'uglify',
        'sass',
        'postcss',
        'inline',
        'htmlmin',
        'string-replace:manifest-html',
        'string-replace:manifest',
        'sign-html'
    ]);

    grunt.registerTask('build-desktop-app-content', [
        'copy:desktop-app-content',
        'string-replace:desktop-html'
    ]);

    grunt.registerTask('build-desktop-update', [
        'copy:desktop-update',
        'copy:desktop-update-helper',
        'sign-desktop-files:desktop-update',
        'compress:desktop-update',
        'sign-archive:desktop-update',
        'validate-desktop-update'
    ]);

    grunt.registerTask('build-desktop-executables', [
        'electron',
        'sign-exe:win32-build-x64',
        'sign-exe:win32-build-ia32',
        'copy:desktop-darwin-helper-x64',
        'copy:desktop-windows-helper-ia32',
        'copy:desktop-windows-helper-x64',
        'codesign:app'
    ]);

    grunt.registerTask('build-desktop-archives', [
        'compress:win32-x64',
        'compress:win32-ia32',
        'compress:linux-x64',
        'compress:linux-ia32'
    ]);

    grunt.registerTask('build-desktop-dist-darwin', [
        'appdmg',
        'codesign:dmg'
    ]);

    grunt.registerTask('build-desktop-dist-win32', [
        'nsis:win32-un-x64',
        'nsis:win32-un-ia32',
        'sign-exe:win32-uninst-x64',
        'sign-exe:win32-uninst-ia32',
        'nsis:win32-x64',
        'nsis:win32-ia32',
        'sign-exe:win32-installer-x64',
        'sign-exe:win32-installer-ia32',
        'copy:desktop-win32-dist-x64',
        'copy:desktop-win32-dist-ia32'
    ]);

    grunt.registerTask('build-desktop-dist-linux', [
        'deb:linux-x64',
        'deb:linux-ia32'
    ]);

    grunt.registerTask('build-desktop-dist', [
        'build-desktop-dist-darwin',
        'build-desktop-dist-win32',
        'build-desktop-dist-linux'
    ]);

    grunt.registerTask('build-desktop', [
        'gitinfo',
        'clean:desktop',
        'build-desktop-app-content',
        'build-desktop-update',
        'build-desktop-executables',
        'build-desktop-archives',
        'build-desktop-dist',
        'sign-dist'
    ]);

    grunt.registerTask('build-cordova-app-content', [
        'string-replace:cordova-html'
    ]);

    grunt.registerTask('build-cordova', [
        'gitinfo',
        'clean:cordova',
        'build-cordova-app-content'
    ]);

    // entry point tasks

    grunt.registerTask('default', 'Default: build web app', [
        'build-web-app'
    ]);

    grunt.registerTask('dev', 'Build project and start web server and watcher', [
        'build-web-app',
        'devsrv'
    ]);

    grunt.registerTask('devsrv', 'Start web server and watcher', [
        'concurrent:dev-server'
    ]);

    grunt.registerTask('desktop', 'Build web and desktop apps for all platforms', [
        'default',
        'build-desktop'
    ]);

    grunt.registerTask('cordova', 'Build cordova app', [
        'default',
        'build-cordova'
    ]);
};
