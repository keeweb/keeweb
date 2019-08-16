module.exports = function(grunt) {
    grunt.registerMultiTask('sign-archive', 'Signs archive with a private key', function() {
        const done = this.async();
        const fs = require('fs');
        const sign = require('../util/sign');
        const file = fs.readFileSync(this.options().file);
        const ix = file.toString('binary').lastIndexOf(this.options().signature);
        if (ix < 0) {
            grunt.warn('Signature placeholder not found');
            return;
        }
        const data = file.slice(0, ix);
        sign(grunt, data).then(signature => {
            signature = Buffer.from(signature.toString('hex'), 'binary');
            if (signature.byteLength !== Buffer.from(this.options().signature, 'binary').byteLength) {
                grunt.warn('Bad signature length');
                return;
            }
            for (let i = 0; i < signature.byteLength; i++) {
                file[ix + i] = signature[i];
            }
            fs.writeFileSync(this.options().file, file);
            done();
        });
    });
};
