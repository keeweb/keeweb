/* eslint-env node */

module.exports = function(grunt) {
    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);
    grunt.loadTasks('grunt/tasks');

    const pkg = require('./package.json');

    const zipCommentPlaceholderPart = 'zip_comment_placeholder_that_will_be_replaced_with_hash';
    const zipCommentPlaceholder = zipCommentPlaceholderPart + '.'.repeat(512 - zipCommentPlaceholderPart.length);
    const electronVersion = pkg.devDependencies['electron'].replace(/^\D/, '');
    const year = new Date().getFullYear();

    const release = grunt.option('beta') ? 'beta' : '';

    const webpackConfigApp = require('./webpack.config.app');
    const webpackConfigMain = require('./webpack.config.main');

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
        clean: {
            dist: ['dist'],
            desktop: ['dist/app', 'dist/build', 'dist/release'],
            cordova: ['dist/app']
        },
        copy: {
            'desktop-update': {
                cwd: 'dist/build/KeeWeb-darwin-x64/KeeWeb.app/Contents/Resources/',
                src: 'app.asar',
                dest: 'dist/build/update/',
                expand: true,
                nonull: true
            },
            'desktop-update-helper': {
                src: ['helper/darwin/KeeWebHelper', 'helper/win32/KeeWebHelper.exe'],
                dest: 'dist/build/update/',
                nonull: true
            },
            'desktop-windows-helper-ia32': {
                src: 'helper/win32/KeeWebHelper.exe',
                dest: 'dist/build/KeeWeb-win32-ia32/Resources/',
                nonull: true
            },
            'desktop-windows-helper-x64': {
                src: 'helper/win32/KeeWebHelper.exe',
                dest: 'dist/build/KeeWeb-win32-x64/Resources/',
                nonull: true
            },
            'desktop-darwin-helper-x64': {
                src: 'helper/darwin/KeeWebHelper',
                dest: 'dist/build/KeeWeb-darwin-x64/KeeWeb.app/Contents/Resources/',
                nonull: true,
                options: { mode: '0755' }
            },
            'desktop-darwin-installer': {
                cwd: 'package/osx/KeeWeb Installer.app',
                dest: 'dist/build/KeeWeb-darwin-x64/KeeWeb.app/Contents/Installer/KeeWeb Installer.app',
                src: '**',
                expand: true,
                nonull: true,
                options: { mode: true }
            },
            'desktop-win32-dist-x64': {
                src: 'dist/build/KeeWeb.win.x64.exe',
                dest: `dist/release/KeeWeb-${pkg.version}.win.x64.exe`,
                nonull: true
            },
            'desktop-win32-dist-ia32': {
                src: 'dist/build/KeeWeb.win.ia32.exe',
                dest: `dist/release/KeeWeb-${pkg.version}.win.ia32.exe`,
                nonull: true
            }
        },
        webpack: {
            web: webpackConfigApp({target: 'web', release: release}),
            'desktop-app': webpackConfigApp({target: 'desktop', release: release}),
            'desktop-main': webpackConfigMain,
            cordova: webpackConfigApp({target: 'cordova', release: release})
        },
        'webpack-dev-server': {
            options: {
                webpack: webpackConfigApp({target: 'web', release: release}),
                publicPath: '/dist/app',
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
        electron: {
            options: {
                name: 'KeeWeb',
                dir: 'dist/app',
                out: 'dist/build',
                electronVersion: electronVersion,
                overwrite: true,
                asar: true,
                'appCopyright': `Copyright © ${year} Antelle`,
                'appVersion': pkg.version,
                'buildVersion': '<%= gitinfo.local.branch.current.shortSHA %>'
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
                    'appBundleId': 'net.antelle.keeweb',
                    'appCategoryType': 'public.app-category.productivity',
                    'extendInfo': 'package/osx/extend.plist'
                }
            },
            win32: {
                options: {
                    platform: 'win32',
                    arch: ['ia32', 'x64'],
                    icon: 'graphics/icon.ico',
                    'buildVersion': pkg.version,
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
                src: ['dist/build/KeeWeb-darwin-x64/KeeWeb.app']
            },
            dmg: {
                options: {
                    identity: 'app'
                },
                src: [`dist/release/KeeWeb-${pkg.version}.mac.dmg`]
            }
        },
        compress: {
            options: {
                level: 6
            },
            'desktop-update': {
                options: { archive: 'dist/release/UpdateDesktop.zip', comment: zipCommentPlaceholder },
                files: [
                    { cwd: 'dist/build/update', src: '**', expand: true, nonull: true }
                ]
            },
            'win32-x64': {
                options: { archive: `dist/release/KeeWeb-${pkg.version}.win.x64.zip` },
                files: [{ cwd: 'dist/build/KeeWeb-win32-x64', src: '**', expand: true }]
            },
            'win32-ia32': {
                options: { archive: `dist/release/KeeWeb-${pkg.version}.win.ia32.zip` },
                files: [{ cwd: 'dist/build/KeeWeb-win32-ia32', src: '**', expand: true }]
            },
            'linux-x64': {
                options: { archive: `dist/release/KeeWeb-${pkg.version}.linux.x64.zip` },
                files: [{ cwd: 'dist/build/KeeWeb-linux-x64', src: '**', expand: true },
                    { cwd: 'graphics', src: '128x128.png', nonull: true, expand: true }]
            },
            'linux-ia32': {
                options: { archive: `dist/release/KeeWeb-${pkg.version}.linux.ia32.zip` },
                files: [{ cwd: 'dist/build/KeeWeb-linux-ia32', src: '**', expand: true },
                    { cwd: 'graphics', src: '128x128.png', nonull: true, expand: true }]
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
                    { x: 192, y: 344, type: 'file', path: 'dist/build/KeeWeb-darwin-x64/KeeWeb.app' }
                ]
            },
            app: {
                dest: `dist/release/KeeWeb-${pkg.version}.mac.dmg`
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
                    output: 'dist/build/KeeWeb.win.x64.exe'
                }
            },
            'win32-un-x64': {
                options: {
                    installScript: 'package/nsis/main-un.nsi',
                    arch: 'x64',
                    output: 'dist/build/KeeWeb-win32-x64/uninst.exe'
                }
            },
            'win32-ia32': {
                options: {
                    installScript: 'package/nsis/main.nsi',
                    arch: 'ia32',
                    output: 'dist/build/KeeWeb.win.ia32.exe'
                }
            },
            'win32-un-ia32': {
                options: {
                    installScript: 'package/nsis/main-un.nsi',
                    arch: 'ia32',
                    output: 'dist/build/KeeWeb-win32-ia32/uninst.exe'
                }
            }
        },
        deb: {
            options: {
                tmpPath: 'dist/build/',
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
                        targetDir: 'dist/release',
                        appName: 'KeeWeb',
                        depends: 'libappindicator1, libgconf2-4',
                        scripts: {
                            postinst: 'package/deb/scripts/postinst'
                        }
                    }
                },
                files: [
                    { cwd: 'package/deb/usr', src: '**', dest: '/usr', expand: true, nonull: true },
                    { cwd: 'dist/build/KeeWeb-linux-x64/', src: '**', dest: '/opt/keeweb-desktop', expand: true, nonull: true },
                    { src: 'graphics/128x128.png', dest: '/usr/share/icons/hicolor/128x128/apps/keeweb.png', nonull: true }
                ]
            },
            'linux-ia32': {
                options: {
                    info: {
                        arch: 'i386',
                        pkgName: `KeeWeb-${pkg.version}.linux.ia32.deb`,
                        targetDir: 'dist/release',
                        appName: 'KeeWeb',
                        depends: 'libappindicator1, libgconf2-4',
                        scripts: {
                            postinst: 'package/deb/scripts/postinst'
                        }
                    }
                },
                files: [
                    { cwd: 'package/deb/usr', src: '**', dest: '/usr', expand: true, nonull: true },
                    { cwd: 'dist/build/KeeWeb-linux-ia32/', src: '**', dest: '/opt/keeweb-desktop', expand: true, nonull: true },
                    { src: 'graphics/128x128.png', dest: '/usr/share/icons/hicolor/128x128/apps/keeweb.png', nonull: true }
                ]
            }
        },
        'sign-archive': {
            'desktop-update': {
                options: {
                    file: 'dist/release/UpdateDesktop.zip',
                    signature: zipCommentPlaceholder
                }
            }
        },
        'sign-desktop-files': {
            'desktop-update': {
                options: {
                    path: 'dist/build/update'
                }
            }
        },
        'validate-desktop-update': {
            desktop: {
                options: {
                    file: 'dist/release/UpdateDesktop.zip',
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
        'sign-html': {
            'app': {
                options: {
                    file: 'dist/index.html',
                    skip: grunt.option('skip-sign')
                }
            }
        },
        'sign-exe': {
            options: {
                spc: 'keys/keeweb.spc',
                key: '01',
                algo: 'sha256',
                url: pkg.homepage
            },
            'win32-build-x64': {
                options: {
                    files: {
                        'dist/build/KeeWeb-win32-x64/KeeWeb.exe': 'KeeWeb',
                        'dist/build/KeeWeb-win32-x64/ffmpeg.dll': '',
                        'dist/build/KeeWeb-win32-x64/libEGL.dll': 'ANGLE libEGL Dynamic Link Library',
                        'dist/build/KeeWeb-win32-x64/libGLESv2.dll': 'ANGLE libGLESv2 Dynamic Link Library',
                        'dist/build/KeeWeb-win32-x64/node.dll': 'Node.js'
                    }
                }
            },
            'win32-build-ia32': {
                options: {
                    files: {
                        'dist/build/KeeWeb-win32-ia32/KeeWeb.exe': 'KeeWeb',
                        'dist/build/KeeWeb-win32-ia32/ffmpeg.dll': '',
                        'dist/build/KeeWeb-win32-ia32/libEGL.dll': 'ANGLE libEGL Dynamic Link Library',
                        'dist/build/KeeWeb-win32-ia32/libGLESv2.dll': 'ANGLE libGLESv2 Dynamic Link Library',
                        'dist/build/KeeWeb-win32-ia32/node.dll': 'Node.js'
                    }
                }
            },
            'win32-uninst-x64': {
                options: {
                    files: {
                        'dist/build/KeeWeb-win32-x64/uninst.exe': 'KeeWeb Uninstaller'
                    }
                }
            },
            'win32-uninst-ia32': {
                options: {
                    files: {
                        'dist/build/KeeWeb-win32-ia32/uninst.exe': 'KeeWeb Uninstaller'
                    }
                }
            },
            'win32-installer-x64': {
                options: {
                    files: {
                        'dist/build/KeeWeb.win.x64.exe': 'KeeWeb Setup'
                    }
                }
            },
            'win32-installer-ia32': {
                options: {
                    files: {
                        'dist/build/KeeWeb.win.ia32.exe': 'KeeWeb Setup'
                    }
                }
            }
        },
        'sign-dist': {
            'dist': {
                options: {
                    sign: 'dist/release/Verify.sign.sha256'
                },
                files: {
                    'dist/release/Verify.sha256': ['dist/release/KeeWeb-*', 'dist/release/UpdateDesktop.zip']
                }
            }
        }
    });

    // compound builder tasks

    grunt.registerTask('build-web-app', [
        'gitinfo',
        'clean',
        'webpack:web',
        'sign-html'
    ]);

    grunt.registerTask('build-desktop-app-content', [
        'webpack:desktop-app',
        'webpack:desktop-main'
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
        'copy:desktop-darwin-installer',
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
        'build-desktop-executables',
        'build-desktop-update',
        'build-desktop-archives',
        'build-desktop-dist',
        'sign-dist'
    ]);

    grunt.registerTask('build-cordova', [
        'gitinfo',
        'clean:cordova',
        'webpack:cordova'
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
        'webpack-dev-server'
    ]);

    grunt.registerTask('desktop', 'Build web and desktop apps for all platforms', [
        'build-desktop'
    ]);

    grunt.registerTask('cordova', 'Build cordova app', [
        'build-cordova'
    ]);
};
