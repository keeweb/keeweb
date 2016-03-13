'use strict';

var Launcher = require('../comp/launcher'),
    AppSettingsModel = require('../models/app-settings-model');

var Storage = {
    file: require('./storage-file'),
    dropbox: require('./storage-dropbox'),
    webdav: require('./storage-webdav'),
    gdrive: require('./storage-gdrive'),
    onedrive: require('./storage-onedrive'),
    cache: Launcher ? require('./storage-file-cache') : require('./storage-cache')
};

_.forEach(Storage, function(prv, name) {
    if (!prv.system) {
        var enabled = AppSettingsModel.instance.get(name);
        if (typeof enabled === 'boolean') {
            prv.enabled = enabled;
        }
    }
});

module.exports = Storage;
