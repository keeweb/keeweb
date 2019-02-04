module.exports = function (grunt) {
    grunt.registerMultiTask('codesign', 'Launches Apple codesign', function () {
        const done = this.async();
        const opt = this.options();
        const config = require('../../keys/codesign.json');
        for (const file of this.files) {
            const args = [
                '-s',
                config.identities[opt.identity]
            ];
            if (opt.deep) {
                args.push('--deep');
            }
            args.push(file.src);
            grunt.log.writeln('codesign:', args.join(' '));
            grunt.util.spawn({
                cmd: 'codesign',
                args: args,
                opts: {stdio: 'inherit'}
            }, (error, result, code) => {
                if (error) {
                    return grunt.warn('codesign: ' + error);
                }
                if (code) {
                    return grunt.warn('codesign exit code ' + code);
                }
                done();
            });
        }
    });
};
