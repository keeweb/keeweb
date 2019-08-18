module.exports = function(grunt) {
    grunt.registerMultiTask('sign-html', 'Signs html page with a private key', function() {
        if (this.options().skip) {
            grunt.log.writeln('Skipped app html signing');
            return;
        }
        const done = this.async();
        const fs = require('fs');
        const sign = require('../util/sign');
        const data = fs.readFileSync(this.options().file);
        let fileStr = data.toString();
        const marker = '<meta name="kw-signature" content="';
        const ix = fileStr.indexOf(marker);
        if (ix < 0) {
            grunt.warn('Signature placeholder not found');
            return;
        }
        sign(null, data)
            .then(signature => {
                signature = signature.toString('base64');
                fileStr = fileStr.replace(marker, marker + signature);
                fs.writeFileSync(this.options().file, fileStr, 'utf8');
                done();
            })
            .catch(e => {
                if (e === 'Cannot find PIN') {
                    grunt.warn(
                        'Error signing app html. To build without sign, please launch grunt with --skip-sign.'
                    );
                } else {
                    grunt.warn('Sign error: ' + e);
                }
                done(false);
            });
    });
};
