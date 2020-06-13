/* eslint-env node */

const fs = require('fs-extra');
const path = require('path');
const debug = require('debug');

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
    grunt.config.set('date', date);

    const dt = date.toISOString().replace(/T.*/, '');
    const year = date.getFullYear();
    const minElectronVersionForUpdate = '9.0.1';
    const zipCommentPlaceholderPart = 'zip_comment_placeholder_that_will_be_replaced_with_hash';
    const zipCommentPlaceholder =
        zipCommentPlaceholderPart + '.'.repeat(512 - zipCommentPlaceholderPart.length);
    const electronVersion = pkg.dependencies.electron.replace(/^\D/, '');
    const skipSign = grunt.option('skip-sign');
    const getCodeSignConfig = () =>
        skipSign ? { identities: {} } : require('./keys/codesign.json');

    const webpackOptions = {
        date,
        beta: !!grunt.option('beta'),
        get sha() {
            return grunt.config.get('gitinfo.local.branch.current.shortSHA');
        }
    };

    const windowsAppVersionString = {
        CompanyName: 'KeeWeb',
        FileDescription: pkg.description,
        OriginalFilename: 'KeeWeb.exe',
        ProductName: 'KeeWeb',
        InternalName: 'KeeWeb'
    };

    grunt.initConfig({
        noop: { noop: {} },
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
            favicon: {
                src: 'app/favicon.png',
                dest: 'tmp/favicon.png',
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
            fonts: {
                src: 'node_modules/font-awesome/fonts/fontawesome-webfont.*',
                dest: 'tmp/fonts/',
                nonull: true,
                expand: true,
                flatten: true
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
            'desktop-update': {
                cwd: 'tmp/desktop/keeweb-linux-x64/resources/',
                src: 'app.asar',
                dest: 'tmp/desktop/update/',
                expand: true,
                nonull: true
            },
            'desktop-update-helper': {
                src: ['helper/darwin/KeeWebHelper', 'helper/win32/KeeWebHelper.exe'],
                dest: 'tmp/desktop/update/',
                nonull: true
            },
            'desktop-darwin-helper': {
                src: 'helper/darwin/KeeWebHelper',
                dest: 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app/Contents/Resources/',
                nonull: true,
                options: { mode: '0755' }
            },
            'desktop-darwin-installer-helper': {
                cwd: 'package/osx/KeeWeb Installer.app',
                src: '**',
                dest:
                    'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app/Contents/Installer/KeeWeb Installer.app',
                expand: true,
                nonull: true,
                options: { mode: true }
            },
            'desktop-windows-helper-x64': {
                src: 'helper/win32/KeeWebHelper.exe',
                dest: 'tmp/desktop/KeeWeb-win32-x64/Resources/',
                nonull: true
            },
            'desktop-windows-helper-ia32': {
                src: 'helper/win32/KeeWebHelper.exe',
                dest: 'tmp/desktop/KeeWeb-win32-ia32/Resources/',
                nonull: true
            },
            'desktop-windows-helper-arm64': {
                src: 'helper/win32/KeeWebHelper.exe',
                dest: 'tmp/desktop/KeeWeb-win32-arm64/Resources/',
                nonull: true
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
            'native-modules-darwin': {
                src: 'node_modules/@keeweb/keeweb-native-modules/*-darwin-x64.node',
                dest: 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app/Contents/Resources/',
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
            }
        },
        eslint: {
            app: ['app/scripts/**/*.js'],
            desktop: ['desktop/**/*.js', '!desktop/node_modules/**'],
            build: ['Gruntfile.js', 'grunt.*.js', 'build/**/*.js', 'webpack.config.js'],
            plugins: ['plugins/**/*.js'],
            util: ['util/**/*.js']
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
                    script: 3
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
            manifest: {
                options: {
                    replacements: [
                        {
                            pattern: '# YYYY-MM-DD:v0.0.0',
                            replacement: '# ' + dt + ':v' + pkg.version
                        },
                        {
                            pattern: '# updmin:v0.0.0',
                            replacement: '# updmin:v' + minElectronVersionForUpdate
                        }
                    ]
                },
                files: { 'dist/manifest.appcache': 'app/manifest.appcache' }
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
            app: webpackConfig.config(webpackOptions),
            test: webpackConfigTest
        },
        'webpack-dev-server': {
            options: {
                webpack: webpackConfig.config({
                    ...webpackOptions,
                    mode: 'development',
                    sha: 'dev'
                }),
                publicPath: '/',
                contentBase: [
                    path.resolve(__dirname, 'tmp'),
                    path.resolve(__dirname, 'app/content')
                ],
                progress: false
            },
            js: {
                keepalive: true,
                port: 8085
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
                buildVersion: '<%= gitinfo.local.branch.current.shortSHA %>'
            },
            linux: {
                options: {
                    name: 'keeweb',
                    platform: 'linux',
                    arch: ['x64'],
                    icon: 'graphics/icon.ico'
                }
            },
            darwin: {
                options: {
                    platform: 'darwin',
                    arch: ['x64'],
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
                            // depends: ['libappindicator1', 'libgconf-2-4', 'gnome-keyring']
                        },
                        snap: {
                            stagePackages: ['libappindicator1', 'libgconf-2-4', 'gnome-keyring']
                        }
                    }
                }
            }
        },
        compress: {
            options: {
                level: 6
            },
            'desktop-update': {
                options: {
                    archive: 'dist/desktop/UpdateDesktop.zip',
                    comment: zipCommentPlaceholder
                },
                files: [{ cwd: 'tmp/desktop/update', src: '**', expand: true, nonull: true }]
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
            options: {
                title: 'KeeWeb',
                icon: 'graphics/icon.icns',
                background: 'graphics/background.png',
                'background-color': '#E0E6F9',
                'icon-size': 80,
                window: { size: { width: 658, height: 498 } },
                contents: [
                    { x: 438, y: 344, type: 'link', path: '/Applications' },
                    {
                        x: 192,
                        y: 344,
                        type: 'file',
                        path: 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app'
                    }
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
                    rev() {
                        return grunt.config.get('gitinfo.local.branch.current.shortSHA');
                    },
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
                    rev() {
                        return grunt.config.get('gitinfo.local.branch.current.shortSHA');
                    }
                }
            },
            'linux-x64': {
                options: {
                    info: {
                        arch: 'amd64',
                        pkgName: `KeeWeb-${pkg.version}.linux.x64.deb`,
                        targetDir: 'dist/desktop',
                        appName: 'KeeWeb',
                        depends: 'libappindicator1, libgconf-2-4, gnome-keyring',
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
        'sign-archive': {
            'desktop-update': {
                options: {
                    file: 'dist/desktop/UpdateDesktop.zip',
                    signature: zipCommentPlaceholder
                }
            }
        },
        'sign-desktop-files': {
            'desktop-update': {
                options: {
                    path: 'tmp/desktop/update'
                }
            }
        },
        'validate-desktop-update': {
            desktop: {
                options: {
                    file: 'dist/desktop/UpdateDesktop.zip',
                    expected: [
                        'app.asar',
                        'helper/darwin/KeeWebHelper',
                        'helper/win32/KeeWebHelper.exe'
                    ],
                    expectedCount: 7,
                    publicKey: 'app/resources/public-key.pem'
                }
            }
        },
        'osx-sign': {
            options: {
                get identity() {
                    return getCodeSignConfig().identities.app;
                },
                hardenedRuntime: true,
                entitlements: 'package/osx/entitlements.mac.plist',
                'entitlements-inherit': 'package/osx/entitlements.mac.plist',
                'gatekeeper-assess': false
            },
            desktop: {
                src: 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app'
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
            desktop: {
                src: 'tmp/desktop/KeeWeb-darwin-x64/KeeWeb.app'
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
                    'dist/desktop/Verify.sha256': [
                        'dist/desktop/KeeWeb-*',
                        'dist/desktop/UpdateDesktop.zip'
                    ]
                }
            }
        },
        'run-test': {
            options: {
                headless: true
            },
            default: 'test/runner.html'
        }
    });
};
