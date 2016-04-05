'use strict';

module.exports = function (grunt) {
    grunt.registerMultiTask('sign-archive', 'Signs archive with a private key', function () {
        var fs = require('fs');
        var crypto = require('crypto');
        var file = fs.readFileSync(this.options().file);
        var ix = file.toString('binary').lastIndexOf(this.options().signature);
        if (ix < 0) {
            grunt.warn('Signature placeholder not found');
            return;
        }
        var sign = crypto.createSign('RSA-SHA256');
        sign.write(file.slice(0, ix));
        sign.end();
        var privateKey = fs.readFileSync(this.options().privateKey, 'binary');
        var signature = new Buffer(sign.sign(privateKey).toString('hex'), 'binary');
        if (signature.byteLength !== new Buffer(this.options().signature, 'binary').byteLength) {
            grunt.warn('Bad signature length');
            return;
        }
        for (var i = 0; i < signature.byteLength; i++) {
            file[ix + i] = signature[i];
        }
        fs.writeFileSync(this.options().file, file);
    });
};
