'use strict';

module.exports = function (grunt) {
    grunt.registerMultiTask('nsis', 'Launches NSIS installer', function (done) {
        let opt = this.options();
        let args = [];
        Object.keys(opt.vars).forEach(key => {
            let value = opt.vars[key];
            if (typeof value === 'function') {
                value = value();
            }
            args.push(`-D${key}=${value}`);
        });
        args.push('-Darch=' + opt.arch);
        args.push('-NOCD');
        args.push(opt.installScript);
        grunt.util.spawn({
            cmd: 'makensis',
            args: args,
            opts: {stdio: 'inherit'}
        }, function (error, result, code) {
            if (error) {
                return grunt.warn('NSIS error: ' + error);
            }
            if (code) {
                return grunt.warn('NSIS exit code ' + code);
            }
            done();
        });
    });
};
