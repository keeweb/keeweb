'use strict';

var getFolderSize = require('get-folder-size');

module.exports = function (grunt) {
    grunt.registerMultiTask('get-dir-size', 'Signs archive with a private key', function () {
        var done = this.async();
        var allPromises = [];
        this.files.forEach(function(file) {
            var totalSize = 0;
            var promises = [];
            file.src.forEach(function(src) {
                promises.push(new Promise(function(resolve, reject) {
                    getFolderSize(src, function(err, size) {
                        if (err) {
                            grunt.fail.fatal('Error getting folder size', src, err);
                            reject(err);
                        } else {
                            totalSize += size;
                            resolve(size);
                        }
                    });
                }));
            });
            allPromises.push(Promise.all(promises).then(function() {
                totalSize = Math.round(totalSize / 1024);
                grunt.config.set(file.dest, totalSize);
                grunt.log.writeln(file.dest + ': ' + totalSize + 'kB');
            }));
        });
        Promise.all(allPromises).then(function() {
            done();
        });
    });
};
