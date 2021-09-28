// prettier-ignore

module.exports = function(grunt) {
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
        'test',
        'default',
        'build-desktop'
    ]);

    grunt.registerTask('desktop-linux', 'Build desktop apps on linux', [
        'clean:desktop',
        'build-desktop-app-content',
        'build-desktop-executables-linux',
        'build-desktop-archives-linux',
        'build-desktop-dist-linux'
    ]);

    grunt.registerTask('desktop-darwin', 'Build desktop apps on macos', [
        'clean:desktop',
        'build-desktop-app-content',
        'build-desktop-executables-darwin',
        'build-desktop-dist-darwin'
    ]);

    grunt.registerTask('desktop-win32', 'Build desktop apps on windows', [
        'clean:desktop',
        'build-desktop-app-content',
        'build-desktop-executables-win32',
        'build-desktop-archives-win32',
        'build-desktop-dist-win32'
    ]);

    grunt.registerTask('finish-release', 'Complete the release started with desktop-*', [
        'sign-dist'
    ]);

    grunt.registerTask('dev-desktop-darwin', 'Build a macOS app in dev environment', [
        'default',
        'build-desktop-app-content',
        'electron:darwin-x64',
        'electron-patch:darwin-x64',
        'build-darwin-installer',
        'copy:desktop-darwin-installer-helper-x64',
        'copy:native-modules-darwin-x64',
        'copy:native-messaging-host-darwin-x64'
    ]);

    grunt.registerTask('dev-desktop-darwin-signed', 'Build a signed macOS app in dev environment', [
        'dev-desktop-darwin',
        'osx-sign:desktop-x64'
    ]);

    grunt.registerTask('dev-desktop-win32', 'Build a Windows app in dev environment', [
        'default',
        'build-desktop-app-content',
        'electron:win32-x64',
        'copy:native-modules-win32-x64',
        'copy:native-messaging-host-win32-x64'
    ]);

    grunt.registerTask('dev-desktop-linux', 'Build a Linux app in dev environment', [
        'default',
        'build-desktop-app-content',
        'electron:linux',
        'chmod:linux-desktop-x64',
        'copy:native-modules-linux-x64',
        'copy:native-messaging-host-linux-x64'
    ]);

    grunt.registerTask('test', 'Build and run tests', [
        'build-test',
        'run-test'
    ]);
};
