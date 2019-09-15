const Launcher = require('../comp/launcher');
const StorageFile = require('./impl/storage-file');
const StorageFileCache = require('./impl/storage-file-cache');
const StorageCache = require('./impl/storage-cache');
const StorageDropbox = require('./impl/storage-dropbox');
const StorageGDrive = require('./impl/storage-gdrive');
const StorageOneDrive = require('./impl/storage-onedrive');
const StorageWebDav = require('./impl/storage-webdav');

const BuiltInStorage = {
    file: new StorageFile(),
    cache: Launcher ? new StorageFileCache() : new StorageCache()
};

const ThirdPartyStorage = {
    dropbox: new StorageDropbox(),
    gdrive: new StorageGDrive(),
    onedrive: new StorageOneDrive(),
    webdav: new StorageWebDav()
};

const storage = BuiltInStorage;
if (!Launcher || Launcher.thirdPartyStoragesSupported) {
    _.extend(storage, ThirdPartyStorage);
}

module.exports = storage;
