module.exports = function (grunt) {
    grunt.registerMultiTask('sign-desktop-files', 'Signs desktop files', async function () {
        const done = this.async();
        const fs = require('fs');
        const path = require('path');
        const sign = require('../util/sign');
        const appPath = this.options().path;

        const signatures = {};
        const signedFiles = [];
        await walk(appPath);

        const data = JSON.stringify(signatures);

        const signaturesWithSelf = {
            ...signatures,
            kwResSelf: await getSignature(Buffer.from(data))
        };
        grunt.file.write(path.join(appPath, 'signatures.json'), JSON.stringify(signaturesWithSelf));

        grunt.log.writeln(`\nSigned ${signedFiles.length} files: ${signedFiles.join(', ')}`);
        done();

        async function walk(dir) {
            const list = fs.readdirSync(dir);
            for (const fileName of list) {
                const file = dir + '/' + fileName;
                const stat = fs.statSync(file);
                if (stat && stat.isDirectory()) {
                    await walk(file);
                } else {
                    const relFile = file.slice(appPath.length + 1);
                    const fileData = grunt.file.read(file, { encoding: null });
                    signatures[relFile] = await getSignature(fileData);
                    signedFiles.push(relFile);
                }
            }
        }

        async function getSignature(data) {
            const signature = await sign(grunt, data);
            grunt.log.write('.');
            return signature.toString('base64');
        }
    });
};
