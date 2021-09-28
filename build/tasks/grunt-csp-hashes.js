module.exports = function (grunt) {
    grunt.registerMultiTask('csp-hashes', 'Adds CSP hashes for inline JS and CSS', function () {
        const opt = this.options();
        for (const file of this.files) {
            const html = grunt.file.read(file.src[0], { encoding: null });
            const { algo } = opt;

            const crypto = require('crypto');

            const hashes = {};

            for (const type of ['style', 'script']) {
                let index = 0;
                while (index >= 0) {
                    index = html.indexOf(`><${type}>`, index);
                    if (index > 0) {
                        index += `><${type}>`.length;
                        const endIndex = html.indexOf(`</${type}>`, index);
                        if (endIndex < 0) {
                            grunt.warn(`Not found: </${type}>`);
                        }
                        const slice = html.slice(index, endIndex);
                        index = endIndex;

                        const hasher = crypto.createHash(algo);
                        hasher.update(slice);
                        const digest = hasher.digest('base64');

                        hashes[type] = hashes[type] || [];
                        hashes[type].push(digest);
                    }
                }
            }

            for (const [type, expected] of Object.entries(opt.expected)) {
                const actual = hashes[type] ? hashes[type].length : 0;
                if (actual !== expected) {
                    grunt.warn(`Expected ${expected} ${type}(s), found ${actual}`);
                }
            }

            let htmlStr = html.toString('latin1');
            for (const [type, digests] of Object.entries(hashes)) {
                const cspIndex = htmlStr.indexOf(`${type}-src 'self'`);
                if (cspIndex < 0) {
                    grunt.warn(`Not found: ${type}-src`);
                }
                const digestsList = digests.map((digest) => `'${algo}-${digest}'`).join(' ');
                htmlStr = htmlStr.replace(`${type}-src 'self'`, `${type}-src ${digestsList}`);
            }

            grunt.log.writeln(
                'Added CSP hashes:',
                Object.entries(hashes)
                    .map(([k, v]) => `${v.length} ${k}(s)`)
                    .join(', ')
            );

            grunt.file.write(file.dest, Buffer.from(htmlStr, 'latin1'));
        }
    });
};
