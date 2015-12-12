'use strict';

var DropboxLink = require('../comp/dropbox-link'),
    Logger = require('../util/logger');

var logger = new Logger('storage-dropbox');

var StorageDropbox = {
    name: 'dropbox',
    enabled: true,

    load: function(path, callback) {
        logger.debug('Load', path);
        var ts = logger.ts();
        DropboxLink.openFile(path, function(err, data, stat) {
            logger.debug('Loaded', path, stat ? stat.versionTag : null, logger.ts(ts));
            if (callback) { callback(err, data, stat ? { rev: stat.versionTag } : null); }
        }, _.noop);
    },

    stat: function(path, callback) {
        logger.debug('Stat', path);
        var ts = logger.ts();
        DropboxLink.stat(path, function(err, stat) {
            logger.debug('Stated', path, stat ? stat.versionTag : null, logger.ts(ts));
            if (callback) { callback(err, stat ? { rev: stat.versionTag } : null); }
        }, _.noop);
    },

    save: function(path, data, callback, rev) {
        logger.debug('Save', path, rev);
        var ts = logger.ts();
        DropboxLink.saveFile(path, data, rev, function(err) {
            logger.debug('Saved', path, logger.ts(ts));
            if (!callback) { return; }
            if (err && err.status === DropboxLink.ERROR_CONFLICT) {
                err = { revConflict: true };
            }
            callback(err);
        }, _.noop);
    }
};

module.exports = StorageDropbox;
