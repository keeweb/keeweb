'use strict';

// https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Build_Instructions/Signing_an_executable_with_Authenticode

module.exports = function (grunt) {
    grunt.registerMultiTask('sign-exe', 'Signs exe file with authenticode certificate', function () {
        const keytar = require('keytar');
        const opt = this.options();
        const done = this.async();
        const password = keytar.getPassword(opt.keytarPasswordService, opt.keytarPasswordAccount);
        if (!password) {
            return grunt.warn('Code sign password not found');
        }
        let spawned = grunt.util.spawn({
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
            ]
        }, (error, result, code) => {
            if (error || code) {
                spawned.kill();
                return grunt.warn(`signtool error ${code}: ${error}`);
            }
            done();
        });
        spawned.stdout.pipe(process.stdout);
        spawned.stderr.pipe(process.stderr);
        spawned.stdin.setEncoding('utf-8');
        spawned.stdin.write(password);
        spawned.stdin.write('\n');
    });
};
