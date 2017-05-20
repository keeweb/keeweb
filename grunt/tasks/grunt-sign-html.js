module.exports = function (grunt) {
    grunt.registerMultiTask('sign-html', 'Signs html page with a private key', function () {
        const fs = require('fs');
        const crypto = require('crypto');
        if (!fs.existsSync(this.options().privateKey)) {
            grunt.log.warn('Private key is missing, app html will not be signed.');
            return;
        }
        let file = fs.readFileSync(this.options().file).toString('utf8');
        const marker = '<meta name="kw-signature" content="';
        const ix = file.indexOf(marker);
        if (ix < 0) {
            grunt.warn('Signature placeholder not found');
            return;
        }
        const sign = crypto.createSign('RSA-SHA256');
        sign.write(file);
        sign.end();
        const privateKey = fs.readFileSync(this.options().privateKey, 'binary');
        const signature = sign.sign(privateKey).toString('base64');
        file = file.replace(marker, marker + signature);
        fs.writeFileSync(this.options().file, file, 'utf8');
    });
};
