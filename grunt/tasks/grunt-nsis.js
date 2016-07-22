'use strict';

module.exports = function (grunt) {
    grunt.registerMultiTask('nsis', 'Launches NSIS installer', function () {
        let done = this.async();
        let opt = this.options();
        let args = [];
        let win = process.platform === 'win32';
        let prefix = win ? '/' : '-';
        Object.keys(opt.vars).forEach(key => {
            let value = opt.vars[key];
            if (typeof value === 'function') {
                value = value();
            }
            if (value) {
                args.push(`${prefix}D${key}=${value}`);
            }
        });
        args.push(`${prefix}Darch=${opt.arch}`);
        args.push(`${prefix}Doutput=${opt.output}`);
        args.push(`${prefix}NOCD`);
        args.push(`${prefix}V2`);
        args.push(opt.installScript);
        let executable = win ? 'C:\\Program Files (x86)\\NSIS\\makensis.exe' : 'makensis';
        grunt.log.writeln('Running NSIS:', args.join(' '));
        grunt.util.spawn({
            cmd: executable,
            args: args,
            opts: {stdio: 'inherit'}
        }, (error, result, code) => {
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
