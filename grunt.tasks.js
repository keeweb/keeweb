module.exports = function(grunt) {
    grunt.registerTask('build-web-app', [
        'gitinfo',
        'clean',
        'eslint',
        'copy:html',
        'copy:favicon',
        'copy:icons',
        'copy:manifest',
        'copy:fonts',
        'webpack:app',
        'inline',
        'htmlmin',
        'csp-hashes',
        'copy:content-dist',
        'string-replace:service-worker',
        'string-replace:manifest',
        'copy:dist-icons',
        'copy:dist-manifest'
    ]);

    grunt.registerTask('build-desktop-app-content', [
        'copy:desktop-html',
        'copy:desktop-app-content',
        'string-replace:desktop-public-key'
    ]);

    grunt.registerTask('build-desktop-update', [
        'copy:desktop-update',
        'copy:desktop-update-helper',
        'sign-desktop-files:desktop-update',
        'compress:desktop-update',
        'sign-archive:desktop-update',
        'validate-desktop-update'
    ]);

    grunt.registerTask('build-desktop-executables-linux', [
        'electron:linux',
        'chmod:linux-desktop-x64'
    ]);

    grunt.registerTask('build-desktop-executables-darwin', ['electron:darwin']);

    grunt.registerTask('build-desktop-executables-win32', [
        'electron:win32',
        'sign-exe:win32-build-x64',
        'sign-exe:win32-build-ia32',
        'copy:desktop-windows-helper-ia32',
        'copy:desktop-windows-helper-x64'
    ]);

    grunt.registerTask('build-desktop-executables', [
        'build-desktop-executables-linux',
        'build-desktop-executables-darwin',
        'build-desktop-executables-win32'
    ]);

    grunt.registerTask('build-desktop-archives-linux', ['compress:linux-x64']);

    grunt.registerTask('build-desktop-archives-win32', [
        'compress:win32-x64',
        'compress:win32-ia32'
    ]);

    grunt.registerTask('build-desktop-archives', [
        'build-desktop-archives-linux',
        'build-desktop-archives-win32'
    ]);

    grunt.registerTask('build-desktop-dist-darwin', ['appdmg']);

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
        'electron-builder:linux',
        'copy:electron-builder-dist-linux-rpm',
        'copy:electron-builder-dist-linux-snap',
        'copy:electron-builder-dist-linux-appimage'
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

    grunt.registerTask('build-cordova-app-content', ['string-replace:cordova-html']);

    grunt.registerTask('build-cordova', ['gitinfo', 'clean:cordova', 'build-cordova-app-content']);

    grunt.registerTask('build-test', ['webpack:test']);
};
