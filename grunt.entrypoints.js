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
        'gitinfo',
        'clean:desktop',
        'build-desktop-app-content',
        'build-desktop-executables-linux',
        'build-desktop-update',
        'build-desktop-archives-linux',
        'build-desktop-dist-linux'
    ]);

    grunt.registerTask('desktop-darwin', 'Build desktop apps on macos', [
        'gitinfo',
        'clean:desktop',
        'build-desktop-app-content',
        'build-desktop-executables-darwin',
        'build-desktop-dist-darwin'
    ]);

    grunt.registerTask('desktop-win32', 'Build desktop apps on windows', [
        'gitinfo',
        'clean:desktop',
        'build-desktop-app-content',
        'build-desktop-executables-win32',
        'build-desktop-archives-win32',
        'build-desktop-dist-win32'
    ]);

    grunt.registerTask('finish-release', 'Complete the release started with desktop-*', [
        'sign-dist'
    ]);

    grunt.registerTask('cordova', 'Build cordova app', [
        'default',
        'build-cordova'
    ]);

    grunt.registerTask('test', 'Build and run tests', [
        'build-test',
        'run-test'
    ]);
};
