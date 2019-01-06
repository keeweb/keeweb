module.exports = function(grunt) {
    grunt.registerTask('default', 'Default: build web app', [
        'build-web-app',
        'sign-html'
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
