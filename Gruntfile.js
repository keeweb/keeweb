'use strict';

var fs = require('fs'),
    path = require('path');

var StringReplacePlugin = require('string-replace-webpack-plugin');

module.exports = function(grunt) {
    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);
    grunt.loadTasks('grunt/tasks');

    var webpack = require('webpack');
    var pkg = require('./package.json');
    var dt = new Date().toISOString().replace(/T.*/, '');
    var electronVersion = '0.34.0';

    function replaceFont(css) {
        css.walkAtRules('font-face', function (rule) {
            var fontFamily = rule.nodes.filter(function(n) { return n.prop === 'font-family'; })[0];
            if (!fontFamily) {
                throw 'Bad font rule: ' + rule.toString();
            }
            var value = fontFamily.value.replace(/["']/g, '');
            var fontFiles = {
                FontAwesome: 'fontawesome-webfont.woff'
            };
            var fontFile = fontFiles[value];
            if (!fontFile) {
                throw 'Unsupported font ' + value + ': ' + rule.toString();
            }
            var data = fs.readFileSync('tmp/fonts/' + fontFile, 'base64');
            var src = 'url(data:application/font-woff;charset=utf-8;base64,{data}) format(\'woff\')'
                .replace('{data}', data);
            //var src = 'url(\'../fonts/fontawesome-webfont.woff\') format(\'woff\')';
            rule.nodes = rule.nodes.filter(function(n) { return n.prop !== 'src'; });
            rule.append({ prop: 'src', value: src });
        });
    }

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
            desktop_dist: ['dist/desktop'],
            desktop_tmp: ['tmp/desktop']
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
            fonts: {
                src: 'bower_components/font-awesome/fonts/fontawesome-webfont.*',
                dest: 'tmp/fonts/',
                nonull: true,
                expand: true,
                flatten: true
            },
            'desktop_osx': {
                src: 'tmp/desktop/KeeWeb.dmg',
                dest: 'dist/desktop/KeeWeb.mac.dmg',
                nonull: true
            },
            'desktop_win': {
                src: 'tmp/desktop/KeeWeb Setup.exe',
                dest: 'dist/desktop/KeeWeb.win32.exe',
                nonull: true
            },
            'desktop_linux': {
                src: 'tmp/desktop/KeeWeb.linux.x64.zip',
                dest: 'dist/desktop/KeeWeb.linux.x64.zip',
                nonull: true
            }
        },
        jshint: {
            options: {
                jshintrc: true
            },
            all: ['app/scripts/**/*.js']
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
                    replacements: [{
                        pattern: '# YYYY-MM-DD:v0.0.0',
                        replacement: '# ' + dt + ':v' + pkg.version
                    }]
                },
                files: { 'dist/manifest.appcache': 'app/manifest.appcache' }
            }
        },
        webpack: {
            js: {
                entry: {
                    app: 'app',
                    vendor: ['zepto', 'jquery', 'underscore', 'backbone', 'kdbxweb', 'baron', 'dropbox', 'pikaday', 'filesaver']
                },
                output: {
                    path: 'tmp/js',
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
                    root: [path.join(__dirname, 'app/scripts'), path.join(__dirname, 'bower_components')],
                    alias: {
                        backbone: 'backbone/backbone-min.js',
                        underscore: 'underscore/underscore-min.js',
                        _: 'underscore/underscore-min.js',
                        zepto: 'zepto/zepto.min.js',
                        jquery: 'zepto/zepto.min.js',
                        kdbxweb: 'kdbxweb/dist/kdbxweb.js',
                        dropbox: 'dropbox/lib/dropbox.min.js',
                        baron: 'baron/baron.min.js',
                        pikaday: 'pikaday/pikaday.js',
                        filesaver: 'FileSaver.js/FileSaver.min.js',
                        templates: path.join(__dirname, 'app/templates')
                    }
                },
                module: {
                    loaders: [
                        { test: /\.html$/, loader: StringReplacePlugin.replace('ejs', { replacements: [{
                            pattern: /\r?\n\s*/g,
                            replacement: function() { return '\n'; }
                        }]})},
                        { test: /runtime\-info\.js$/, loader: StringReplacePlugin.replace({ replacements: [
                            { pattern: /@@VERSION/g, replacement: function() { return pkg.version; } },
                            { pattern: /@@DATE/g, replacement: function() { return dt; } }
                        ]})},
                        { test: /zepto(\.min)?\.js$/, loader: 'exports?Zepto; delete window.$; delete window.Zepto;' },
                        { test: /baron(\.min)?\.js$/, loader: 'exports?baron; delete window.baron;' },
                        { test: /pikadat\.js$/, loader: 'uglify' }
                    ]
                },
                plugins: [
                    new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.js'),
                    new webpack.BannerPlugin('keeweb v' + pkg.version + ', (c) 2015 ' + pkg.author +
                        ', opensource.org/licenses/' + pkg.license),
                    new webpack.optimize.OccurenceOrderPlugin(),
                    new webpack.ProvidePlugin({ _: 'underscore', $: 'jquery' }),
                    new webpack.IgnorePlugin(/^(moment)$/),
                    new StringReplacePlugin()
                ],
                node: {
                    console: false,
                    process: false,
                    Buffer: false,
                    __filename: false,
                    __dirname: false
                }
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
            scripts: {
                files: ['app/scripts/**/*.js', 'app/templates/**/*.html'],
                tasks: ['webpack']
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
                dir: 'electron',
                out: 'tmp/desktop',
                version: electronVersion,
                overwrite: true,
                'app-version': pkg.version,
                'build-version': '<%= gitinfo.local.branch.current.shortSHA %>'
            },
            osx: {
                options: {
                    platform: 'darwin',
                    arch: 'x64',
                    icon: 'graphics/app.icns'
                }
            },
            linux: {
                options: {
                    platform: 'linux',
                    arch: 'x64',
                    icon: 'graphics/app.ico'
                }
            },
            win32: {
                options: {
                    platform: 'win32',
                    arch: 'ia32',
                    icon: 'graphics/app.ico',
                    'version-string': {
                        CompanyName: 'antelle.github.io',
                        LegalCopyright: 'Antelle, MIT license',
                        FileDescription: 'KeeWeb Desktop',
                        OriginalFilename: 'KeeWeb.exe',
                        FileVersion: pkg.version,
                        ProductVersion: pkg.version,
                        ProductName: 'KeeWeb',
                        InternalName: 'KeeWeb'
                    }
                }
            }
        },
        'electron_builder': {
            options: {
                out: path.join(__dirname, 'tmp/desktop'),
                basePath: __dirname,
                config: {
                    osx: {
                        title: 'KeeWeb',
                        background: path.join(__dirname, 'graphics/dmg-bg.png'),
                        icon: path.join(__dirname, 'graphics/app.icns'),
                        'icon-size': 80,
                        contents: [
                            {'x': 438, 'y': 344, 'type': 'link', 'path': '/Applications'},
                            {'x': 192, 'y': 344, 'type': 'file'}
                        ]
                    },
                    win: {
                        title: 'KeeWeb',
                        icon: path.join(__dirname, 'graphics/app.ico')
                    }
                }
            },
            osx: {
                options: {
                    platform: 'osx',
                    appPath: path.join(__dirname, 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app')
                }
            },
            win: {
                options: {
                    platform: 'win32',
                    appPath: path.join(__dirname, 'tmp/desktop/KeeWeb-win32-ia32')
                }
            }
        },
        compress: {
            linux: {
                options: {
                    archive: 'tmp/desktop/KeeWeb.linux.x64.zip'
                },
                files: [{ cwd: 'tmp/desktop/KeeWeb-linux-x64', src: '**', expand: true }]
            }
        }
    });

    grunt.registerTask('default', [
        'bower-install-simple',
        'clean',
        'jshint',
        'copy:html',
        'copy:favicon',
        'copy:fonts',
        'webpack',
        'uglify',
        'sass',
        'postcss',
        'inline',
        'htmlmin',
        'string-replace'
    ]);

    grunt.registerTask('desktop', [
        'gitinfo',
        'clean:desktop_tmp',
        'clean:desktop_dist',
        'electron',
        'electron_builder',
        'compress:linux',
        'copy:desktop_osx',
        'copy:desktop_win',
        'copy:desktop_linux',
        'clean:desktop_tmp'
    ]);
};
