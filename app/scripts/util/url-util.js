'use strict';

var UrlUtil = {
    multiSlashRegex: /\/{2,}/g,
    lastPartRegex: /[^\/]+$/,

    getDataFileName: function(url) {
        var ix = url.lastIndexOf('/');
        if (ix >= 0) {
            url = url.substr(ix + 1);
        }
        url = url.replace(/\?.*/, '').replace(/\.kdbx/i, '');
        return url;
    },

    fixSlashes: function(url) {
        return url.replace(this.multiSlashRegex, '/');
    },

    fileToDir: function(url) {
        return url.replace(this.lastPartRegex, '');
    }
};

module.exports = UrlUtil;
