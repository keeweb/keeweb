'use strict';

var Launcher = require('../comp/launcher');

var Storage = {
    file: require('./storage-file'),
    dropbox: require('./storage-dropbox'),
    cache: Launcher ? require('./storage-file-cache') : require('./storage-cache')
};

module.exports = Storage;
