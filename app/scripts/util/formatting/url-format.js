const UrlFormat = {
    multiSlashRegex: /\/{2,}/g,
    lastPartRegex: /\/?[^\/\\]+$/,
    kdbxEndRegex: /\.kdbx$/i,

    getDataFileName(url) {
        const ix = url.lastIndexOf('/');
        if (ix >= 0) {
            url = url.substr(ix + 1);
        }
        url = url.replace(/\?.*/, '').replace(/\.kdbx/i, '');
        return url;
    },

    isKdbx(url) {
        return url && this.kdbxEndRegex.test(url);
    },

    fixSlashes(url) {
        return url.replace(this.multiSlashRegex, '/');
    },

    fileToDir(url) {
        return url.replace(this.lastPartRegex, '') || '/';
    }
};

module.exports = UrlFormat;
