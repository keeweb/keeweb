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
        'webpack',
        'uglify',
        'sass',
        'postcss',
        'inline',
        'htmlmin',
        'string-replace:manifest-html',
        'string-replace:manifest',
        'copy:dist-icons',
        'copy:dist-manifest'
    ]);

    grunt.registerTask('build-desktop-app-content', [
        'copy:desktop-app-content',
        'string-replace:desktop-public-key',
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

    grunt.registerTask('build-cordova-app-content', [
        'string-replace:cordova-html'
    ]);

    grunt.registerTask('build-cordova', [
        'gitinfo',
        'clean:cordova',
        'build-cordova-app-content'
    ]);
};
