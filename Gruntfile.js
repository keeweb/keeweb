const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const debug = require('debug');
const { v5: pkgUuid } = require('uuid');

const webpackConfig = require('./build/webpack.config');
const webpackConfigTest = require('./test/test.webpack.config');
const pkg = require('./package.json');

debug.enable('electron-notarize');

module.exports = function (grunt) {
    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);

    grunt.loadTasks('build/tasks');

    require('./grunt.tasks')(grunt);
    require('./grunt.entrypoints')(grunt);

    const date = new Date();
    const guid = pkgUuid(`${pkg.repository.url}`, pkgUuid.URL);
    const uuid = pkgUuid(pkg.version, guid);

    grunt.config.set('date', date);
    grunt.config.set('guid', guid);
    grunt.config.set('uuid', uuid);

    const dt = date.toISOString().replace(/T.*/, '');
    const year = date.getFullYear();
    const electronVersion = pkg.dependencies.electron.replace(/^\D/, '');
    const skipSign = grunt.option('skip-sign');
    const getCodeSignConfig = () =>
        skipSign ? { identities: {} } : require('./keys/codesign.json');

    let sha = grunt.option('commit-sha');
    if (!sha) {
        try {
            sha = execSync('git rev-parse --short HEAD').toString('utf8').trim();
        } catch (e) {
            grunt.warn(
                "Cannot get commit sha from git. It's recommended to build KeeWeb from a git repo " +
                    'because commit sha is displayed in the UI, however if you would like to build from a folder, ' +
                    'you can override what will be displayed in the UI with --commit-sha=xxx.'
            );
        }
    }
    grunt.log.writeln(`Building KeeWeb v${pkg.version} (${sha})`);

    const webpackOptions = {
        date,
        guid,
        beta: !!grunt.option('beta'),
        sha,
        appleTeamId: '3LE7JZ657W'
    };

    const windowsAppVersionString = {
        CompanyName: 'KeeWeb',
        FileDescription: pkg.description,
        OriginalFilename: 'KeeWeb.exe',
        ProductName: 'KeeWeb',
        InternalName: 'KeeWeb'
    };

    const appdmgOptions = (arch) => ({
        title: 'KeeWeb',
        icon: 'graphics/icon.icns',
        background: 'graphics/dmg-background.png',
        'background-color': '#E0E6F9',
        'icon-size': 80,
        window: { size: { width: 658, height: 498 } },
        contents: [
            { x: 438, y: 344, type: 'link', path: '/Applications' },
            {
                x: 192,
                y: 344,
                type: 'file',
                path: `tmp/desktop/KeeWeb-darwin-${arch}/KeeWeb.app`
            }
        ]
    });

    const linuxDependencies = [
        'libappindicator1',
        'libgconf-2-4',
        'gnome-keyring',
        'libxtst6',
        'libx11-6',
        'libatspi2.0-0'
    ];

    const appConfig = webpackConfig({
        ...webpackOptions,
        mode: 'development',
        sha: 'dev'
    });

    grunt.initConfig({
        noop: { noop: {} },
        clean: {
            dist: ['dist', 'tmp'],
            desktop: ['tmp/desktop', 'dist/desktop']
        },
        copy: {
            html: {
                src: 'app/index.html',
                dest: 'tmp/index.html',
                nonull: true
            },
            'content-dist': {
                cwd: 'app/content/',
                src: '**',
                dest: 'dist/',
                expand: true,
                nonull: true
            },
            icons: {
                cwd: 'app/icons/',
                src: ['*.png', '*.svg'],
                dest: 'tmp/icons/',
                expand: true,
                nonull: true
            },
            'dist-icons': {
                cwd: 'app/icons/',
                src: ['*.png', '*.svg'],
                dest: 'dist/icons/',
                expand: true,
                nonull: true
            },
            manifest: {
                cwd: 'app/manifest/',
                src: ['*.json', '*.xml'],
                dest: 'tmp/',
                expand: true,
                nonull: true
            },
            'dist-manifest': {
                cwd: 'app/manifest/',
                src: ['*.json', '*.xml'],
                dest: 'dist/',
                expand: true,
                nonull: true
            },
            'desktop-html': {
                src: 'dist/index.html',
                dest: 'tmp/desktop/app/index.html',
                nonull: true
            },
            'desktop-app-content': {
                cwd: 'desktop/',
                src: ['**', '!package-lock.json'],
                dest: 'tmp/desktop/app/',
                expand: true,
                nonull: true
            },
            'desktop-darwin-installer-helper-x64': {
                cwd: 'tmp/desktop/KeeWeb Installer.app',
                src: '**',
                dest: 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app/Contents/Installer/KeeWeb Installer.app',
                expand: true,
                nonull: true,
                options: { mode: true }
            },
            'desktop-darwin-installer-helper-arm64': {
                cwd: 'tmp/desktop/KeeWeb Installer.app',
                src: '**',
                dest: 'tmp/desktop/KeeWeb-darwin-arm64/KeeWeb.app/Contents/Installer/KeeWeb Installer.app',
                expand: true,
                nonull: true,
                options: { mode: true }
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
            },
            'desktop-win32-dist-arm64': {
                src: 'tmp/desktop/KeeWeb.win.arm64.exe',
                dest: `dist/desktop/KeeWeb-${pkg.version}.win.arm64.exe`,
                nonull: true
            },
            'native-modules-darwin-x64': {
                src: 'node_modules/@keeweb/keeweb-native-modules/*-darwin-x64.node',
                dest: 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app/Contents/Resources/',
                nonull: true
            },
            'native-modules-darwin-arm64': {
                src: 'node_modules/@keeweb/keeweb-native-modules/*-darwin-arm64.node',
                dest: 'tmp/desktop/KeeWeb-darwin-arm64/KeeWeb.app/Contents/Resources/',
                nonull: true
            },
            'native-modules-win32-x64': {
                src: 'node_modules/@keeweb/keeweb-native-modules/*-win32-x64.node',
                dest: 'tmp/desktop/KeeWeb-win32-x64/resources/',
                nonull: true
            },
            'native-modules-win32-ia32': {
                src: 'node_modules/@keeweb/keeweb-native-modules/*-win32-ia32.node',
                dest: 'tmp/desktop/KeeWeb-win32-ia32/resources/',
                nonull: true
            },
            'native-modules-win32-arm64': {
                src: 'node_modules/@keeweb/keeweb-native-modules/*-win32-arm64.node',
                dest: 'tmp/desktop/KeeWeb-win32-arm64/resources/',
                nonull: true
            },
            'native-modules-linux-x64': {
                src: 'node_modules/@keeweb/keeweb-native-modules/*-linux-x64.node',
                dest: 'tmp/desktop/keeweb-linux-x64/resources/',
                nonull: true
            },
            'electron-builder-dist-linux-rpm': {
                src: `tmp/desktop/electron-builder/KeeWeb-${pkg.version}.x86_64.rpm`,
                dest: `dist/desktop/KeeWeb-${pkg.version}.linux.x86_64.rpm`,
                nonull: true
            },
            'electron-builder-dist-linux-snap': {
                src: `tmp/desktop/electron-builder/KeeWeb_${pkg.version}_amd64.snap`,
                dest: `dist/desktop/KeeWeb-${pkg.version}.linux.snap`,
                nonull: true
            },
            'electron-builder-dist-linux-appimage': {
                src: `tmp/desktop/electron-builder/keeweb-${pkg.version}.AppImage`,
                dest: `dist/desktop/KeeWeb-${pkg.version}.linux.AppImage`,
                nonull: true
            },
            'darwin-installer-icon': {
                src: 'graphics/icon.icns',
                dest: 'tmp/desktop/KeeWeb Installer.app/Contents/Resources/applet.icns',
                nonull: true
            },
            'native-messaging-host-darwin-x64': {
                src: 'node_modules/@keeweb/keeweb-native-messaging-host/darwin-x64/keeweb-native-messaging-host',
                dest: 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app/Contents/MacOS/util/keeweb-native-messaging-host',
                nonull: true,
                options: { mode: '0755' }
            },
            'native-messaging-host-darwin-arm64': {
                src: 'node_modules/@keeweb/keeweb-native-messaging-host/darwin-arm64/keeweb-native-messaging-host',
                dest: 'tmp/desktop/KeeWeb-darwin-arm64/KeeWeb.app/Contents/MacOS/util/keeweb-native-messaging-host',
                nonull: true,
                options: { mode: '0755' }
            },
            'native-messaging-host-linux-x64': {
                src: 'node_modules/@keeweb/keeweb-native-messaging-host/linux-x64/keeweb-native-messaging-host',
                dest: 'tmp/desktop/keeweb-linux-x64/keeweb-native-messaging-host',
                nonull: true,
                options: { mode: '0755' }
            },
            'native-messaging-host-win32-x64': {
                src: 'node_modules/@keeweb/keeweb-native-messaging-host/win32-x64/keeweb-native-messaging-host.exe',
                dest: 'tmp/desktop/KeeWeb-win32-x64/keeweb-native-messaging-host.exe',
                nonull: true
            },
            'native-messaging-host-win32-ia32': {
                src: 'node_modules/@keeweb/keeweb-native-messaging-host/win32-ia32/keeweb-native-messaging-host.exe',
                dest: 'tmp/desktop/KeeWeb-win32-ia32/keeweb-native-messaging-host.exe',
                nonull: true
            },
            'native-messaging-host-win32-arm64': {
                src: 'node_modules/@keeweb/keeweb-native-messaging-host/win32-arm64/keeweb-native-messaging-host.exe',
                dest: 'tmp/desktop/KeeWeb-win32-arm64/keeweb-native-messaging-host.exe',
                nonull: true
            }
        },

        eslint: {
            app: ['app/scripts/**/*.js'],
            desktop: ['desktop/**/*.js', '!desktop/node_modules/**'],
            build: ['Gruntfile.js', 'grunt.*.js', 'build/**/*.js', 'webpack.config.js'],
            plugins: ['plugins/**/*.js'],
            util: ['util/**/*.js'],
            installer: ['package/osx/installer.js']
        },

        inline: {
            app: {
                src: 'tmp/index.html',
                dest: 'tmp/app.html'
            }
        },

        'csp-hashes': {
            options: {
                algo: 'sha512',
                expected: {
                    style: 1,
                    script: 1
                }
            },
            app: {
                src: 'tmp/app.html',
                dest: 'dist/index.html'
            }
        },

        htmlmin: {
            options: {
                removeComments: true,
                collapseWhitespace: true
            },
            app: {
                files: {
                    'tmp/app.html': 'tmp/app.html'
                }
            }
        },

        'string-replace': {
            'update-manifest': {
                options: {
                    replacements: [
                        {
                            pattern: /"version":\s*".*?"/,
                            replacement: `"version": "${pkg.version}"`
                        },
                        {
                            pattern: /"date":\s*".*?"/,
                            replacement: `"date": "${dt}"`
                        },
                        {
                            pattern: /"guid":\s*".*?"/,
                            replacement: `"guid": "${guid}"`
                        }
                    ]
                },
                files: { 'dist/update.json': 'app/update.json' }
            },
            'service-worker': {
                options: { replacements: [{ pattern: '0.0.0', replacement: pkg.version }] },
                files: { 'dist/service-worker.js': 'app/service-worker.js' }
            },
            'desktop-public-key': {
                options: {
                    replacements: [
                        {
                            pattern: "'@@PUBLIC_KEY_CONTENT'",
                            replacement:
                                '`' +
                                fs
                                    .readFileSync('app/resources/public-key.pem', {
                                        encoding: 'utf8'
                                    })
                                    .trim() +
                                '`'
                        }
                    ]
                },
                files: { 'tmp/desktop/app/main.js': 'desktop/main.js' }
            }
        },

        webpack: {
            app: webpackConfig(webpackOptions),
            test: webpackConfigTest
        },

        'webpack-dev-server': {
            options: appConfig,
            start: {
                devServer: {
                    setupMiddlewares: function (middlewares, devServer) {
                        const port = devServer.options.port;
                        const https = devServer.options.https ? 's' : '';

                        const domain1 = `http${https}://${devServer.options.host}:${port}`;
                        const domain2 = `http://[::1]:${port}`;

                        grunt.log.writeln(
                            `\n---------------------------------------------------------------------`
                                .grey.bold
                        );
                        grunt.log.writeln(
                            `  KeeWeb server succesfully started! Access it at:\n`.yellow.bold
                        );
                        grunt.log.writeln(`       → ${domain1}`.green.bold);
                        grunt.log.writeln(`       → ${domain2}`.green.bold);
                        grunt.log.writeln(
                            `---------------------------------------------------------------------\n\n`
                                .grey.bold
                        );

                        return middlewares;
                    },
                    port: 8085,
                    client: {
                        logging: 'error',
                        overlay: true
                    },
                    hot: 'only',
                    static: [
                        /*
                            publicPath: ['/static-public-path-one/', '/static-public-path-two/'],
                            serveIndex: {}
                                https://github.com/expressjs/serve-index
                            watch: {}
                                https://github.com/paulmillr/chokidar
                        */

                        {
                            directory: path.resolve(__dirname, 'tmp'),
                            staticOptions: {},
                            serveIndex: true,
                            watch: true
                        },
                        {
                            directory: path.resolve(__dirname, 'app/content'),
                            staticOptions: {},
                            publicPath: '/',
                            serveIndex: true,
                            watch: true
                        }
                    ]
                }
            }
        },

        electron: {
            options: {
                name: 'KeeWeb',
                dir: 'tmp/desktop/app',
                out: 'tmp/desktop',
                electronVersion,
                overwrite: true,
                asar: true,
                appCopyright: `Copyright © ${year} Antelle`,
                appVersion: pkg.version,
                buildVersion: sha
            },
            linux: {
                options: {
                    name: 'keeweb',
                    platform: 'linux',
                    arch: 'x64',
                    icon: 'graphics/icon.ico'
                }
            },
            'darwin-x64': {
                options: {
                    platform: 'darwin',
                    arch: 'x64',
                    icon: 'graphics/icon.icns',
                    appBundleId: 'net.antelle.keeweb',
                    appCategoryType: 'public.app-category.productivity',
                    extendInfo: 'package/osx/extend.plist'
                }
            },
            'darwin-arm64': {
                options: {
                    platform: 'darwin',
                    arch: 'arm64',
                    icon: 'graphics/icon.icns',
                    appBundleId: 'net.antelle.keeweb',
                    appCategoryType: 'public.app-category.productivity',
                    extendInfo: 'package/osx/extend.plist'
                }
            },
            'win32-x64': {
                options: {
                    platform: 'win32',
                    arch: 'x64',
                    icon: 'graphics/icon.ico',
                    buildVersion: pkg.version,
                    'version-string': windowsAppVersionString
                }
            },
            'win32-ia32': {
                options: {
                    platform: 'win32',
                    arch: 'ia32',
                    icon: 'graphics/icon.ico',
                    buildVersion: pkg.version,
                    'version-string': windowsAppVersionString
                }
            },
            'win32-arm64': {
                options: {
                    platform: 'win32',
                    arch: 'arm64',
                    icon: 'graphics/icon.ico',
                    buildVersion: pkg.version,
                    'version-string': windowsAppVersionString
                }
            }
        },

        'electron-builder': {
            linux: {
                options: {
                    publish: 'never',
                    targets: 'linux',
                    prepackaged: 'tmp/desktop/keeweb-linux-x64',
                    config: {
                        appId: 'net.antelle.keeweb',
                        productName: 'keeweb',
                        copyright: `Copyright © ${year} Antelle`,
                        directories: {
                            output: 'tmp/desktop/electron-builder',
                            app: 'desktop',
                            buildResources: 'graphics'
                        },
                        fileAssociations: {
                            ext: 'kdbx',
                            name: 'KeePass 2 database',
                            mimeType: 'application/x-keepass2'
                        },
                        linux: {
                            target: ['AppImage', 'snap', 'rpm'],
                            category: 'Utility'
                        },
                        rpm: {
                            // depends: linuxDependencies
                        },
                        snap: {
                            stagePackages: linuxDependencies
                        }
                    }
                }
            }
        },

        'electron-patch': {
            'win32-x64': 'tmp/desktop/KeeWeb-win32-x64/KeeWeb.exe',
            'win32-ia32': 'tmp/desktop/KeeWeb-win32-ia32/KeeWeb.exe',
            'win32-arm64': 'tmp/desktop/KeeWeb-win32-arm64/KeeWeb.exe',
            'darwin-x64': 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app',
            'darwin-arm64': 'tmp/desktop/KeeWeb-darwin-arm64/KeeWeb.app',
            'linux': 'tmp/desktop/KeeWeb-linux-x64/keeweb'
        },

        osacompile: {
            options: {
                language: 'JavaScript'
            },
            installer: {
                files: {
                    'tmp/desktop/KeeWeb Installer.app': 'package/osx/installer.js'
                }
            }
        },

        compress: {
            options: {
                level: 6
            },
            'win32-x64': {
                options: { archive: `dist/desktop/KeeWeb-${pkg.version}.win.x64.zip` },
                files: [{ cwd: 'tmp/desktop/KeeWeb-win32-x64', src: '**', expand: true }]
            },
            'win32-ia32': {
                options: { archive: `dist/desktop/KeeWeb-${pkg.version}.win.ia32.zip` },
                files: [{ cwd: 'tmp/desktop/KeeWeb-win32-ia32', src: '**', expand: true }]
            },
            'win32-arm64': {
                options: { archive: `dist/desktop/KeeWeb-${pkg.version}.win.arm64.zip` },
                files: [{ cwd: 'tmp/desktop/KeeWeb-win32-arm64', src: '**', expand: true }]
            },
            'linux-x64': {
                options: { archive: `dist/desktop/KeeWeb-${pkg.version}.linux.x64.zip` },
                files: [
                    { cwd: 'tmp/desktop/keeweb-linux-x64', src: '**', expand: true },
                    { cwd: 'graphics', src: '128x128.png', nonull: true, expand: true }
                ]
            }
        },

        appdmg: {
            x64: {
                options: appdmgOptions('x64'),
                dest: `dist/desktop/KeeWeb-${pkg.version}.mac.x64.dmg`
            },
            arm64: {
                options: appdmgOptions('arm64'),
                dest: `dist/desktop/KeeWeb-${pkg.version}.mac.arm64.dmg`
            }
        },

        nsis: {
            options: {
                vars: {
                    version: pkg.version,
                    rev: sha,
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
            },
            'win32-arm64': {
                options: {
                    installScript: 'package/nsis/main.nsi',
                    arch: 'arm64',
                    output: 'tmp/desktop/KeeWeb.win.arm64.exe'
                }
            },
            'win32-un-arm64': {
                options: {
                    installScript: 'package/nsis/main-un.nsi',
                    arch: 'arm64',
                    output: 'tmp/desktop/KeeWeb-win32-arm64/uninst.exe'
                }
            }
        },

        chmod: {
            'linux-desktop-x64': {
                options: {
                    mode: '4755'
                },
                src: ['tmp/desktop/keeweb-linux-x64/chrome-sandbox']
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
                    rev: sha
                }
            },
            'linux-x64': {
                options: {
                    info: {
                        arch: 'amd64',
                        pkgName: `KeeWeb-${pkg.version}.linux.x64.deb`,
                        targetDir: 'dist/desktop',
                        appName: 'KeeWeb',
                        depends: linuxDependencies.join(', '),
                        scripts: {
                            postinst: 'package/deb/scripts/postinst'
                        }
                    }
                },
                files: [
                    { cwd: 'package/deb/usr', src: '**', dest: '/usr', expand: true, nonull: true },
                    {
                        cwd: 'tmp/desktop/keeweb-linux-x64/',
                        src: '**',
                        dest: '/usr/share/keeweb-desktop',
                        expand: true,
                        nonull: true
                    },
                    {
                        src: 'graphics/128x128.png',
                        dest: '/usr/share/icons/hicolor/128x128/apps/keeweb.png',
                        nonull: true
                    }
                ]
            }
        },

        'osx-sign': {
            options: {
                get identity() {
                    return getCodeSignConfig().identities.app;
                },
                hardenedRuntime: true,
                entitlements: 'package/osx/entitlements.plist',
                'entitlements-inherit': 'package/osx/entitlements-inherit.plist',
                'gatekeeper-assess': false
            },
            'desktop-x64': {
                options: {
                    'provisioning-profile': './keys/keeweb.provisionprofile'
                },
                src: 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app'
            },
            'desktop-arm64': {
                options: {
                    'provisioning-profile': './keys/keeweb.provisionprofile'
                },
                src: 'tmp/desktop/KeeWeb-darwin-arm64/KeeWeb.app'
            },
            'installer': {
                src: 'tmp/desktop/KeeWeb Installer.app'
            }
        },

        notarize: {
            options: {
                appBundleId: 'net.antelle.keeweb',
                get appleId() {
                    return getCodeSignConfig().appleId;
                },
                appleIdPassword: '@keychain:AC_PASSWORD',
                get ascProvider() {
                    return getCodeSignConfig().teamId;
                }
            },
            'desktop-x64': {
                src: 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app'
            },
            'desktop-arm64': {
                src: 'tmp/desktop/KeeWeb-darwin-arm64/KeeWeb.app'
            }
        },

        'sign-exe': {
            options: {
                url: pkg.homepage,
                get windows() {
                    return getCodeSignConfig().windows;
                },
                get certHash() {
                    return getCodeSignConfig().microsoftCertHash;
                }
            },
            'win32-build-x64': {
                options: {
                    files: {
                        'tmp/desktop/KeeWeb-win32-x64/KeeWeb.exe': 'KeeWeb',
                        'tmp/desktop/KeeWeb-win32-x64/keeweb-native-messaging-host.exe':
                            'KeeWeb Native Messaging Host',
                        'tmp/desktop/KeeWeb-win32-x64/ffmpeg.dll': '',
                        'tmp/desktop/KeeWeb-win32-x64/libEGL.dll':
                            'ANGLE libEGL Dynamic Link Library',
                        'tmp/desktop/KeeWeb-win32-x64/libGLESv2.dll':
                            'ANGLE libGLESv2 Dynamic Link Library'
                    }
                }
            },
            'win32-build-ia32': {
                options: {
                    files: {
                        'tmp/desktop/KeeWeb-win32-ia32/KeeWeb.exe': 'KeeWeb',
                        'tmp/desktop/KeeWeb-win32-ia32/keeweb-native-messaging-host.exe':
                            'KeeWeb Native Messaging Host',
                        'tmp/desktop/KeeWeb-win32-ia32/ffmpeg.dll': '',
                        'tmp/desktop/KeeWeb-win32-ia32/libEGL.dll':
                            'ANGLE libEGL Dynamic Link Library',
                        'tmp/desktop/KeeWeb-win32-ia32/libGLESv2.dll':
                            'ANGLE libGLESv2 Dynamic Link Library'
                    }
                }
            },
            'win32-build-arm64': {
                options: {
                    files: {
                        'tmp/desktop/KeeWeb-win32-arm64/KeeWeb.exe': 'KeeWeb',
                        'tmp/desktop/KeeWeb-win32-arm64/keeweb-native-messaging-host.exe':
                            'KeeWeb Native Messaging Host',
                        'tmp/desktop/KeeWeb-win32-arm64/ffmpeg.dll': '',
                        'tmp/desktop/KeeWeb-win32-arm64/libEGL.dll':
                            'ANGLE libEGL Dynamic Link Library',
                        'tmp/desktop/KeeWeb-win32-arm64/libGLESv2.dll':
                            'ANGLE libGLESv2 Dynamic Link Library'
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
            'win32-uninst-arm64': {
                options: {
                    files: {
                        'tmp/desktop/KeeWeb-win32-arm64/uninst.exe': 'KeeWeb Uninstaller'
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
            },
            'win32-installer-arm64': {
                options: {
                    files: {
                        'tmp/desktop/KeeWeb.win.arm64.exe': 'KeeWeb Setup'
                    }
                }
            }
        },

        'sign-dist': {
            dist: {
                options: {
                    sign: 'dist/desktop/Verify.sign.sha256'
                },
                files: {
                    'dist/desktop/Verify.sha256': ['dist/desktop/KeeWeb-*']
                }
            }
        },

        'run-test': {
            options: {
                headless: 'new'
            },
            default: 'test/runner.html'
        },

        virustotal: {
            options: {
                prefix: `keeweb.v${pkg.version}-${sha}.`,
                timeout: 10 * 60 * 1000,
                get apiKey() {
                    return require('./keys/virus-total.json').apiKey;
                }
            },
            html: 'dist/index.html'
        }
    });
};
