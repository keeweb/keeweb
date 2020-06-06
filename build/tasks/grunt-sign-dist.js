module.exports = function (grunt) {
    grunt.registerMultiTask('sign-dist', 'Creates files signatures', async function () {
        const path = require('path');
        const crypto = require('crypto');
        const sign = require('../util/sign');

        const done = this.async();
        const opt = this.options();

        const results = [];

        for (const file of this.files) {
            grunt.log.writeln(`Calculating sha256 for ${file.src.length} files...`);
            for (const src of file.src) {
                const basename = path.basename(src);
                const file = grunt.file.read(src, { encoding: null });

                const hash = crypto.createHash('sha256');
                hash.update(file);
                const digest = hash.digest('hex');

                const rawSignature = await sign(grunt, file);
                const signature = rawSignature.toString('hex');

                results.push({ basename, digest, signature });

                grunt.log.writeln(basename);
            }

            grunt.file.write(
                file.dest,
                results.map((line) => `${line.digest} *${line.basename}`).join('\n')
            );
            grunt.file.write(
                opt.sign,
                results.map((line) => `${line.signature} *${line.basename}`).join('\n')
            );
        }

        done();
    });
};
