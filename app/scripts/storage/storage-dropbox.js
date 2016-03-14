'use strict';

var DropboxLink = require('../comp/dropbox-link'),
    AppSettingsModel = require('../models/app-settings-model'),
    UrlUtils = require('../util/url-util'),
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

    _toFullPath: function(path) {
        var rootFolder = AppSettingsModel.instance.get('dropboxFolder');
        if (rootFolder) {
            path = UrlUtils.fixSlashes('/' + rootFolder + '/' + path);
        }
        return path;
    },

    _toRelPath: function(path) {
        var rootFolder = AppSettingsModel.instance.get('dropboxFolder');
        if (rootFolder) {
            var ix = path.toLowerCase().indexOf(rootFolder.toLowerCase());
            if (ix === 0) {
                path = path.substr(rootFolder.length);
            } else if (ix === 1) {
                path = path.substr(rootFolder.length + 1);
            }
            path = UrlUtils.fixSlashes('/' + path);
        }
        return path;
    },

    needShowOpenConfig: function() {
        return !DropboxLink.isValidKey();
    },

    getOpenConfig: function() {
        return {
            desc: 'dropboxSetupDesc',
            fields: [
                {id: 'key', title: 'dropboxAppKey', desc: 'dropboxAppKeyDesc', type: 'text', required: true, pattern: '\\w{10,}'},
                {id: 'folder', title: 'dropboxFolder', desc: 'dropboxFolderDesc', type: 'text', placeholder: 'dropboxFolderPlaceholder'}
            ]
        };
    },

    applyConfig: function(config, callback) {
        DropboxLink.authenticate(function(err) {
            if (!err) {
                if (config.folder) {
                    config.folder = config.folder.replace(/\\/g, '/').trim();
                    if (config.folder[0] === '/') {
                        config.folder = config.folder.substr(1);
                    }
                }
                AppSettingsModel.instance.set({
                    dropboxAppKey: config.key,
                    dropboxFolder: config.folder
                });
            }
            callback(err);
        }, config.key);
    },

    getPathForName: function(fileName) {
        return '/' + fileName + '.kdbx';
    },

    load: function(path, opts, callback) {
        logger.debug('Load', path);
        var ts = logger.ts();
        path = this._toFullPath(path);
        DropboxLink.openFile(path, function(err, data, stat) {
            logger.debug('Loaded', path, stat ? stat.versionTag : null, logger.ts(ts));
            err = StorageDropbox._convertError(err);
            if (callback) { callback(err, data, stat ? { rev: stat.versionTag } : null); }
        }, _.noop);
    },

    stat: function(path, opts, callback) {
        logger.debug('Stat', path);
        var ts = logger.ts();
        path = this._toFullPath(path);
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
        path = this._toFullPath(path);
        DropboxLink.saveFile(path, data, rev, function(err, stat) {
            logger.debug('Saved', path, logger.ts(ts));
            if (!callback) { return; }
            err = StorageDropbox._convertError(err);
            callback(err, stat ? { rev: stat.versionTag } : null);
        }, _.noop);
    },

    list: function(callback) {
        var that = this;
        DropboxLink.authenticate(function(err) {
            if (err) { return callback(err); }
            DropboxLink.list(that._toFullPath(''), function(err, files, dirStat, filesStat) {
                if (err) { return callback(err); }
                var result = filesStat
                    .filter(function(f) { return !f.isFolder && !f.isRemoved; })
                    .map(function(f) {
                        return {
                            name: f.name,
                            path: that._toRelPath(f.path),
                            rev: f.versionTag
                        };
                    });
                callback(null, result);
            });
        });
    }
};

module.exports = StorageDropbox;
