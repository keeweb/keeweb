module.exports = function(grunt) {
    // prettier-ignore
    grunt.registerTask('default', 'Default: build web app', [
        'build-web-app'
    ]);

    // prettier-ignore
    grunt.registerTask('dev', 'Build project and start web server and watcher', [
        'build-web-app',
        'devsrv'
    ]);

    // prettier-ignore
    grunt.registerTask('devsrv', 'Start web server and watcher', [
        'webpack-dev-server'
    ]);

    // prettier-ignore
    grunt.registerTask('desktop', 'Build web and desktop apps for all platforms', [
        'test',
        'default',
        'build-desktop'
    ]);

    // prettier-ignore
    grunt.registerTask('desktop-linux', 'Build desktop apps on linux', [
        'gitinfo',
        'clean:desktop',
        'build-desktop-app-content',
        'build-desktop-executables-linux',
        'build-desktop-update',
        'build-desktop-archives-linux',
        'build-desktop-dist-linux'
    ]);

    // prettier-ignore
    grunt.registerTask('desktop-darwin', 'Build desktop apps on macos', [
        'gitinfo',
        'clean:desktop',
        'build-desktop-app-content',
        'build-desktop-executables-darwin',
        'build-desktop-dist-darwin'
    ]);

    // prettier-ignore
    grunt.registerTask('desktop-win32', 'Build desktop apps on windows', [
        'gitinfo',
        'clean:desktop',
        'build-desktop-app-content',
        'build-desktop-executables-win32',
        'build-desktop-archives-win32',
        'build-desktop-dist-win32'
    ]);

    // prettier-ignore
    grunt.registerTask('finish-release', 'Complete the release started with desktop-*', [
        'sign-dist'
    ]);

    // prettier-ignore
    grunt.registerTask('cordova', 'Build cordova app', [
        'default',
        'build-cordova'
    ]);

    // prettier-ignore
    grunt.registerTask('test', 'Build and run tests', [
        'build-test',
        'run-test'
    ]);
};
