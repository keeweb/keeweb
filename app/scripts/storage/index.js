'use strict';

const Launcher = require('../comp/launcher');

const FileStorage = {
    file: require('./storage-file'),
    cache: Launcher ? require('./storage-file-cache') : require('./storage-cache')
};

const ThirdPartyStorage = {
    dropbox: require('./storage-dropbox'),
    webdav: require('./storage-webdav'),
    gdrive: require('./storage-gdrive'),
    onedrive: require('./storage-onedrive')
};

let Storage = [];

if (window.cordova) {
    Storage = FileStorage;
} else {
    Storage = FileStorage.concat(ThirdPartyStorage);
}

module.exports = Storage;
