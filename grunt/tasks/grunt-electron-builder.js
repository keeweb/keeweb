'use strict';

var builder = require('electron-builder');
var macPackager = require('electron-builder/out/macPackager');
var linuxPackager = require('electron-builder/out/linuxPackager');

var version;

// workaround for https://github.com/electron-userland/electron-builder/issues/323
macPackager.default.prototype._origPrepareAppInfo = macPackager.default.prototype.prepareAppInfo;
macPackager.default.prototype.prepareAppInfo = function(appInfo) {
    this.platformSpecificBuildOptions.bundleVersion = version;
    return this._origPrepareAppInfo(appInfo);
};

// we don't have 512x512 icon
var createFromIcns = linuxPackager.LinuxPackager.prototype.createFromIcns;
linuxPackager.LinuxPackager.prototype.createFromIcns = function() {
    return createFromIcns.apply(this, arguments).then(function(res) {
        return res.filter(function(item) { return item.indexOf('512x512') < 0; });
    });
};

module.exports = function (grunt) {
    grunt.registerMultiTask('electron-builder', 'Create app installer with electron-builder', function () {
        version = grunt.config.get('gitinfo.local.branch.current.shortSHA');
        var done = this.async();
        builder.build(this.options())
            .then(function () { done(); })
            .catch(function (err) { grunt.warn(err || 'electron-builder error'); });
    });
};
