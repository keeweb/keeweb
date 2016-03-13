'use strict';

var DropboxLink = require('../comp/dropbox-link'),
    Logger = require('../util/logger');

var logger = new Logger('storage-dropbox');

var StorageDropbox = {
    name: 'dropbox',
    icon: 'dropbox',
    enabled: true,
    uipos: 20,

    _convertError: function(err) {
        if (!err) {
            return err;
        }
        if (err.status === DropboxLink.ERROR_NOT_FOUND) {
            err.notFound = true;
        }
        if (err.status === DropboxLink.ERROR_CONFLICT) {
            err.revConflict = true;
        }
        return err;
    },

    needShowOpenConfig: function() {
        return false;
    },

    getPathForName: function(fileName) {
        return '/' + fileName + '.kdbx';
    },

    load: function(path, opts, callback) {
        logger.debug('Load', path);
        var ts = logger.ts();
        DropboxLink.openFile(path, function(err, data, stat) {
            logger.debug('Loaded', path, stat ? stat.versionTag : null, logger.ts(ts));
            err = StorageDropbox._convertError(err);
            if (callback) { callback(err, data, stat ? { rev: stat.versionTag } : null); }
        }, _.noop);
    },

    stat: function(path, opts, callback) {
        logger.debug('Stat', path);
        var ts = logger.ts();
        DropboxLink.stat(path, function(err, stat) {
            if (stat && stat.isRemoved) {
                err = new Error('File removed');
                err.notFound = true;
            }
            logger.debug('Stated', path, stat ? stat.versionTag : null, logger.ts(ts));
            err = StorageDropbox._convertError(err);
            if (callback) { callback(err, stat ? { rev: stat.versionTag } : null); }
        }, _.noop);
    },

    save: function(path, opts, data, callback, rev) {
        logger.debug('Save', path, rev);
        var ts = logger.ts();
        DropboxLink.saveFile(path, data, rev, function(err, stat) {
            logger.debug('Saved', path, logger.ts(ts));
            if (!callback) { return; }
            err = StorageDropbox._convertError(err);
            callback(err, stat ? { rev: stat.versionTag } : null);
        }, _.noop);
    },

    list: function(callback) {
        DropboxLink.authenticate(function(err) {
            if (err) { return callback(err); }
            DropboxLink.getFileList(function(err, files, dirStat, filesStat) {
                if (err) { return callback(err); }
                var result = filesStat
                    .filter(function(f) { return !f.isFolder && !f.isRemoved; })
                    .map(function(f) { return { name: f.name, path: f.path, rev: f.versionTag }; });
                callback(null, result);
            });
        });
    }
};

module.exports = StorageDropbox;
