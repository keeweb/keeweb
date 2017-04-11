const Launcher = require('../comp/launcher');

const BuiltInStorage = {
    file: require('./storage-file'),
    cache: Launcher ? require('./storage-file-cache') : require('./storage-cache')
};

const ThirdPartyStorage = {
    dropbox: require('./storage-dropbox'),
    webdav: require('./storage-webdav'),
    gdrive: require('./storage-gdrive'),
    onedrive: require('./storage-onedrive')
};

let storages = _.extend(BuiltInStorage, ThirdPartyStorage);
if (Launcher && !Launcher.thirdPartyStoragesSupported) {
    storages = BuiltInStorage;
}

module.exports = storages;
