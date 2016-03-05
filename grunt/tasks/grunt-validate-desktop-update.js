'use strict';

module.exports = function (grunt) {
    grunt.registerMultiTask('validate-desktop-update', 'Validates desktop update package', function () {
        var path = require('path');
        var crypto = require('crypto');
        var fs = require('fs');
        var done = this.async();
        var StreamZip = require(path.resolve(__dirname, '../../electron/node_modules/node-stream-zip'));
        var zip = new StreamZip({ file: this.options().file, storeEntries: true });
        var expFiles = this.options().expected;
        var publicKey = fs.readFileSync(this.options().publicKey, 'binary');
        var zipFileData = fs.readFileSync(this.options().file);
        zip.on('error', function(err) {
            grunt.warn(err);
        });
        zip.on('ready', function() {
            var valid = true;
            if (!zip.comment) {
                grunt.warn('No comment in ZIP');
                return;
            }
            if (zip.comment.length !== 512) {
                grunt.warn('Bad comment length in ZIP');
                return;
            }
            var verify  = crypto.createVerify('RSA-SHA256');
            verify.write(zipFileData.slice(0, zip.centralDirectory.headerOffset + 22));
            verify.end();
            var signature = new Buffer(zip.comment, 'hex');
            if (!verify.verify(publicKey, signature)) {
                grunt.warn('Invalid ZIP signature');
                return;
            }
            expFiles.forEach(function(entry) {
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
