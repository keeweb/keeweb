'use strict';

var builder = require('electron-builder').init();

module.exports = function (grunt) {
    grunt.registerMultiTask('electron_builder', 'Create app installer with electron-builder', function () {
        var done = this.async();
        builder.build(this.options(), function(err) {
            if (err) {
                grunt.warn(err);
                return;
            }
            done();
        });
    });
};
