module.exports = function (grunt) {
    grunt.registerMultiTask('electron-builder', 'Runs electron-builder', function () {
        const done = this.async();

        const opt = this.options();

        const builder = require('electron-builder');
        const Platform = builder.Platform;

        builder
            .build({
                ...opt,
                targets: Platform[opt.targets.toUpperCase()].createTarget()
            })
            .then(done)
            .catch((error) => {
                return grunt.warn('electron-builder returned an error: \n' + error);
            });
    });
};
