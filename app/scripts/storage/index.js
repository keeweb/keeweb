'use strict';

var Launcher = require('../comp/launcher');

var Storage = {
    file: require('./storage-file'),
    dropbox: require('./storage-dropbox'),
    webdav: require('./storage-webdav'),
    gdrive: require('./storage-gdrive'),
    onedrive: require('./storage-onedrive'),
    cache: Launcher ? require('./storage-file-cache') : require('./storage-cache')
};

_.forEach(Storage, prv => prv.init());

module.exports = Storage;
