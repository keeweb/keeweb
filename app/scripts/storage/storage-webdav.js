'use strict';

var Logger = require('../util/logger');

var logger = new Logger('storage-webdav');

var StorageDropbox = {
    name: 'webdav',
    icon: 'server',
    enabled: true,

    openFields: [
        { id: 'url', title: 'openUrl', desc: 'openUrlDesc', type: 'text', required: true },
        { id: 'user', title: 'openUser', placeholder: 'openUserPlaceholder', type: 'text' },
        { id: 'password', title: 'openPass', placeholder: 'openPassPlaceholder', type: 'password' }
    ],

    load: function(path, callback) {
        logger.debug('Load', path);
        var ts = logger.ts();
        var stat = {};
        logger.debug('Loaded', path, stat ? stat.versionTag : null, logger.ts(ts));
        callback('not implemented');
    },

    stat: function(path, callback) {
        logger.debug('Stat', path);
        var ts = logger.ts();
        var stat = {};
        logger.debug('Stated', path, stat ? stat.versionTag : null, logger.ts(ts));
        callback('not implemented');
    },

    save: function(path, data, callback, rev) {
        logger.debug('Save', path, rev);
        var ts = logger.ts();
        logger.debug('Saved', path, logger.ts(ts));
        callback('not implemented');
    }
};

module.exports = StorageDropbox;
