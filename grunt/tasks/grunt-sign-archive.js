module.exports = function (grunt) {
    grunt.registerMultiTask('sign-archive', 'Signs archive with a private key', function () {
        const fs = require('fs');
        const crypto = require('crypto');
        const file = fs.readFileSync(this.options().file);
        const ix = file.toString('binary').lastIndexOf(this.options().signature);
        if (ix < 0) {
            grunt.warn('Signature placeholder not found');
            return;
        }
        const sign = crypto.createSign('RSA-SHA256');
        sign.write(file.slice(0, ix));
        sign.end();
        const privateKey = fs.readFileSync(this.options().privateKey, 'binary');
        const signature = new Buffer(sign.sign(privateKey).toString('hex'), 'binary');
        if (signature.byteLength !== new Buffer(this.options().signature, 'binary').byteLength) {
            grunt.warn('Bad signature length');
            return;
        }
        for (let i = 0; i < signature.byteLength; i++) {
            file[ix + i] = signature[i];
        }
        fs.writeFileSync(this.options().file, file);
    });
};
