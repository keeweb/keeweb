const UrlUtil = {
    multiSlashRegex: /\/{2,}/g,
    lastPartRegex: /\/?[^\/\\]+$/,
    kdbxEndRegex: /\.kdbx$/i,

    getDataFileName: function(url) {
        const ix = url.lastIndexOf('/');
        if (ix >= 0) {
            url = url.substr(ix + 1);
        }
        url = url.replace(/\?.*/, '').replace(/\.kdbx/i, '');
        return url;
    },

    isKdbx: function(url) {
        return url && this.kdbxEndRegex.test(url);
    },

    fixSlashes: function(url) {
        return url.replace(this.multiSlashRegex, '/');
    },

    fileToDir: function(url) {
        return url.replace(this.lastPartRegex, '') || '/';
    }
};

module.exports = UrlUtil;
