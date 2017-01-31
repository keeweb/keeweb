'use strict';

const Launcher = require('../comp/launcher');

const Storage = {
    file: require('./storage-file'),
    dropbox: require('./storage-dropbox'),
    webdav: require('./storage-webdav'),
    gdrive: require('./storage-gdrive'),
    onedrive: require('./storage-onedrive'),
    cache: Launcher ? require('./storage-file-cache') : require('./storage-cache')
};

module.exports = Storage;
