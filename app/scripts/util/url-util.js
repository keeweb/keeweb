'use strict';

var UrlUtil = {
    getDataFileName: function(url) {
        var ix = url.lastIndexOf('/');
        if (ix >= 0) {
            url = url.substr(ix + 1);
        }
        url = url.replace(/\?.*/, '').replace(/\.kdbx/i, '');
        return url;
    }
};

module.exports = UrlUtil;
