module.exports = function(grunt) {
    grunt.registerMultiTask('validate-desktop-update', 'Validates desktop update package', function() {
        const path = require('path');
        const crypto = require('crypto');
        const fs = require('fs');
        const done = this.async();
        const StreamZip = require(path.resolve(__dirname, '../../desktop/node_modules/node-stream-zip'));
        const zip = new StreamZip({ file: this.options().file, storeEntries: true });
        const expFiles = this.options().expected;
        const expFilesCount = this.options().expectedCount;
        const publicKey = fs.readFileSync(this.options().publicKey, 'binary');
        const zipFileData = fs.readFileSync(this.options().file);
        zip.on('error', err => {
            grunt.warn(err);
        });
        zip.on('ready', () => {
            let valid = true;
            if (!zip.comment) {
                grunt.warn('No comment in ZIP');
                return;
            }
            if (zip.comment.length !== 512) {
                grunt.warn('Bad comment length in ZIP');
                return;
            }
            const verify = crypto.createVerify('RSA-SHA256');
            verify.write(zipFileData.slice(0, zip.centralDirectory.headerOffset + 22));
            verify.end();
            const signature = Buffer.from(zip.comment, 'hex');
            if (!verify.verify(publicKey, signature)) {
                grunt.warn('Invalid ZIP signature');
                return;
            }
            if (zip.entriesCount !== expFilesCount) {
                grunt.warn(`ZIP contains ${zip.entriesCount} entries, expected ${expFilesCount}`);
                valid = false;
            }
            expFiles.forEach(entry => {
                try {
                    if (!zip.entryDataSync(entry)) {
                        grunt.warn('Corrupted entry in desktop update archive: ' + entry);
                        valid = false;
                    }
                } catch (e) {
                    grunt.warn('Entry not found in desktop update archive: ' + entry);
                    valid = false;
                }
            });
            if (valid) {
                done();
            }
        });
    });
};
