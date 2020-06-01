const osxSign = require('electron-osx-sign');

module.exports = function (grunt) {
    grunt.registerMultiTask(
        'osx-sign',
        'Signs a macOS electron app using electron-osx-sign',
        async function () {
            const done = this.async();
            const opt = this.options();

            Promise.all(
                this.files[0].src.map((app) => {
                    return new Promise((resolve) => {
                        osxSign(
                            {
                                ...opt,
                                app
                            },
                            (err) => {
                                if (err) {
                                    grunt.warn('electron-osx-sign returned an error: \n' + err);
                                } else {
                                    grunt.log.writeln('signed:', app);
                                }
                                resolve();
                            }
                        );
                    });
                })
            ).then(done);
        }
    );
};
