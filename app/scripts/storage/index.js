'use strict';

var Launcher = require('../comp/launcher');

var Storage = {
    file: require('./storage-file'),
    dropbox: require('./storage-dropbox'),
    webdav: require('./storage-webdav'),
    cache: Launcher ? require('./storage-file-cache') : require('./storage-cache')
};

module.exports = Storage;
