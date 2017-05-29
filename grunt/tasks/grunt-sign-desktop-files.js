module.exports = function (grunt) {
    grunt.registerMultiTask('sign-desktop-files', 'Signs desktop files', function () {
        const fs = require('fs');
        const path = require('path');
        const crypto = require('crypto');
        const appPath = this.options().path;
        const privateKey = grunt.file.read(this.options().privateKey, { encoding: null });

        const signatures = {};
        const signedFiles = [];
        walk(appPath);

        const data = JSON.stringify(signatures);
        signatures.self = getSignature(Buffer.from(data));
        grunt.file.write(path.join(appPath, 'signatures.json'), JSON.stringify(signatures));

        grunt.log.writeln(`Signed ${signedFiles.length} files: ${signedFiles.join(', ')}`);

        function walk(dir) {
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                file = dir + '/' + file;
                const stat = fs.statSync(file);
                if (stat && stat.isDirectory()) {
                    walk(file);
                } else {
                    const relFile = file.substr(appPath.length + 1);
                    const fileData = grunt.file.read(file, { encoding: null });
                    signatures[relFile] = getSignature(fileData);
                    signedFiles.push(relFile);
                }
            });
        }

        function getSignature(data) {
            const sign = crypto.createSign('RSA-SHA256');
            sign.write(data);
            sign.end();
            return sign.sign(privateKey).toString('base64');
        }
    });
};
