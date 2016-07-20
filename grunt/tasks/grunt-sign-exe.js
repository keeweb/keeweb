'use strict';

// https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Build_Instructions/Signing_an_executable_with_Authenticode

module.exports = function (grunt) {
    grunt.registerMultiTask('sign-exe', 'Signs exe file with authenticode certificate', function () {
        const opt = this.options();
        const done = this.async();
        grunt.util.spawn({
            cmd: 'signcode',
            args: [
                '-spc', opt.spc,
                '-v', opt.pvk,
                '-a', opt.algo,
                '-$', 'commercial',
                '-n', opt.name,
                '-i', opt.url,
                '-t', 'http://timestamp.verisign.com/scripts/timstamp.dll',
                '-tr', 10,
                opt.file
            ],
            opts: { stdio: 'inherit' }
        }, (error, result, code) => {
            if (error || code) {
                return grunt.log.warn(`signtool error ${code}: ${error}`);
            }
            done();
        });
    });
};
