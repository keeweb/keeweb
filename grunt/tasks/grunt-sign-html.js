'use strict';

module.exports = function (grunt) {
    grunt.registerMultiTask('sign-html', 'Signs html page with a private key', function () {
        var fs = require('fs');
        var crypto = require('crypto');
        if (!fs.existsSync(this.options().privateKey)) {
            grunt.log.warn('Private key is missing, app html will not be signed.');
            return;
        }
        var file = fs.readFileSync(this.options().file).toString('utf8');
        var marker = '<meta name="kw-signature" content="';
        var ix = file.indexOf(marker);
        if (ix < 0) {
            grunt.warn('Signature placeholder not found');
            return;
        }
        var sign = crypto.createSign('RSA-SHA256');
        sign.write(file);
        sign.end();
        var privateKey = fs.readFileSync(this.options().privateKey, 'binary');
        var signature = sign.sign(privateKey).toString('base64');
        file = file.replace(marker, marker + signature);
        fs.writeFileSync(this.options().file, file, 'utf8');
    });
};
