module.exports = function (grunt) {
    grunt.registerMultiTask('sign-dist', 'Creates files signatures', function () {
        const path = require('path');
        const crypto = require('crypto');

        const done = this.async();
        const opt = this.options();

        const privateKey = grunt.file.read(opt.privateKey, { encoding: null });

        const results = [];

        for (const file of this.files) {
            grunt.log.writeln(`Calculating sha256 for ${file.src.length} files...`);
            for (const src of file.src) {
                const basename = path.basename(src);
                const file = grunt.file.read(src, { encoding: null });

                const hash = crypto.createHash('sha256');
                hash.update(file);
                const digest = hash.digest('hex');

                const sign = crypto.createSign('RSA-SHA256');
                sign.write(file);
                sign.end();
                const signature = sign.sign(privateKey).toString('hex');

                results.push({ basename, digest, signature });

                grunt.log.writeln(basename);
            }

            grunt.file.write(file.dest, results.map(line => `${line.digest} *${line.basename}`).join('\n'));
            grunt.file.write(opt.sign, results.map(line => `${line.signature} *${line.basename}`).join('\n'));
        }

        done();
    });
};
