'use strict';

var Storage = {
    file: require('./storage-file'),
    dropbox: require('./storage-dropbox'),
    cache: require('./storage-cache')
};

module.exports = Storage;
