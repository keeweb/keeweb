'use strict';

module.exports = function (grunt) {
    grunt.registerMultiTask('validate-desktop-update', 'Validates desktop update package', function () {
        var path = require('path');
        var done = this.async();
        var StreamZip = require(path.resolve(__dirname, '../../electron/node_modules/node-stream-zip'));
        var zip = new StreamZip({ file: this.options().file, storeEntries: true });
        var expFiles = this.options().expected;
        zip.on('error', function(err) {
            grunt.warn(err);
        });
        zip.on('ready', function() {
            var valid = true;
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
