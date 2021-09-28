const { notarize } = require('electron-notarize');

module.exports = function (grunt) {
    grunt.registerMultiTask(
        'notarize',
        'Notarizes a macOS electron app using electron-notarize',
        async function () {
            const done = this.async();
            const opt = this.options();

            Promise.all(
                this.files[0].src.map((appPath) =>
                    notarize({ ...opt, appPath })
                        .then(() => {
                            grunt.log.writeln('notarized:', appPath);
                        })
                        .catch((err) => {
                            grunt.warn('electron-notarize returned an error: \n' + err);
                        })
                )
            ).then(done);
        }
    );
};
