'use strict';

var Launcher = require('../comp/launcher');

var Storage = {
    file: new (require('./storage-file'))(),
    dropbox: new (require('./storage-dropbox'))(),
    webdav: new (require('./storage-webdav'))(),
    gdrive: new (require('./storage-gdrive'))(),
    onedrive: new (require('./storage-onedrive'))(),
    cache: new (Launcher ? require('./storage-file-cache') : require('./storage-cache'))()
};

_.forEach(Storage, function(prv) {
    prv.init();
});

module.exports = Storage;
