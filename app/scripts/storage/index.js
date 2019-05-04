import Launcher from '../comp/launcher';

const BuiltInStorage = {
    file: require('./storage-file').default,
    cache: Launcher ? require('./storage-file-cache').default : require('./storage-cache').default
};

const ThirdPartyStorage = {
    dropbox: require('./storage-dropbox').default,
    webdav: require('./storage-webdav').default,
    gdrive: require('./storage-gdrive').default,
    onedrive: require('./storage-onedrive').default
};

const storage = BuiltInStorage;
if (!Launcher || Launcher.thirdPartyStoragesSupported) {
    _.extend(storage, ThirdPartyStorage);
}

export default storage;
