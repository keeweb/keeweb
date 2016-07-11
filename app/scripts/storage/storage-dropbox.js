'use strict';

var StorageBase = require('./storage-base'),
    DropboxLink = require('../comp/dropbox-link'),
    Locale = require('../util/locale'),
    UrlUtil = require('../util/url-util');

var StorageDropbox = StorageBase.extend({
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
        var rootFolder = this.appSettings.get('dropboxFolder');
        if (rootFolder) {
            path = UrlUtil.fixSlashes('/' + rootFolder + '/' + path);
        }
        return path;
    },

    _toRelPath: function(path) {
        var rootFolder = this.appSettings.get('dropboxFolder');
        if (rootFolder) {
            var ix = path.toLowerCase().indexOf(rootFolder.toLowerCase());
            if (ix === 0) {
                path = path.substr(rootFolder.length);
            } else if (ix === 1) {
                path = path.substr(rootFolder.length + 1);
            }
            path = UrlUtil.fixSlashes('/' + path);
        }
        return path;
    },

    _fixConfigFolder: function(folder) {
        folder = folder.replace(/\\/g, '/').trim();
        if (folder[0] === '/') {
            folder = folder.substr(1);
        }
        return folder;
    },

    needShowOpenConfig: function() {
        return !DropboxLink.isValidKey();
    },

    getOpenConfig: function() {
        return {
            desc: 'dropboxSetupDesc',
            fields: [
                {id: 'key', title: 'dropboxAppKey', desc: 'dropboxAppKeyDesc', type: 'text', required: true, pattern: '\\w+'},
                {id: 'folder', title: 'dropboxFolder', desc: 'dropboxFolderDesc', type: 'text', placeholder: 'dropboxFolderPlaceholder'}
            ]
        };
    },

    getSettingsConfig: function() {
        var fields = [];
        var appKey = DropboxLink.getKey();
        var linkField = {id: 'link', title: 'dropboxLink', type: 'select', value: 'custom',
            options: { app: 'dropboxLinkApp', full: 'dropboxLinkFull', custom: 'dropboxLinkCustom' } };
        var keyField = {id: 'key', title: 'dropboxAppKey', desc: 'dropboxAppKeyDesc', type: 'text', required: true, pattern: '\\w+',
            value: appKey};
        var folderField = {id: 'folder', title: 'dropboxFolder', desc: 'dropboxFolderSettingsDesc', type: 'text',
            value: this.appSettings.get('dropboxFolder') || ''};
        var canUseBuiltInKeys = DropboxLink.canUseBuiltInKeys();
        if (canUseBuiltInKeys) {
            fields.push(linkField);
            if (appKey === DropboxLink.Keys.AppFolder) {
                linkField.value = 'app';
            } else if (appKey === DropboxLink.Keys.FullDropbox) {
                linkField.value = 'full';
                fields.push(folderField);
            } else {
                fields.push(keyField);
                fields.push(folderField);
            }
        } else {
            fields.push(keyField);
            fields.push(folderField);
        }
        return { fields: fields };
    },

    applyConfig: function(config, callback) {
        var that = this;
        DropboxLink.authenticate(function(err) {
            if (!err) {
                if (config.folder) {
                    config.folder = that._fixConfigFolder(config.folder);
                }
                that.appSettings.set({
                    dropboxAppKey: config.key,
                    dropboxFolder: config.folder
                });
                DropboxLink.resetClient();
            }
            callback(err);
        }, config.key);
    },

    applySetting: function(key, value) {
        switch (key) {
            case 'link':
                key = 'dropboxAppKey';
                switch (value) {
                    case 'app':
                        value = DropboxLink.Keys.AppFolder;
                        break;
                    case 'full':
                        value = DropboxLink.Keys.FullDropbox;
                        break;
                    case 'custom':
                        value = '(your app key)';
                        break;
                    default:
                        return;
                }
                DropboxLink.resetClient();
                break;
            case 'key':
                key = 'dropboxAppKey';
                break;
            case 'folder':
                key = 'dropboxFolder';
                value = this._fixConfigFolder(value);
                break;
            default:
                return;
        }
        this.appSettings.set(key, value);
    },

    getPathForName: function(fileName) {
        return '/' + fileName + '.kdbx';
    },

    load: function(path, opts, callback) {
        var that = this;
        that.logger.debug('Load', path);
        var ts = that.logger.ts();
        path = that._toFullPath(path);
        DropboxLink.openFile(path, function(err, data, stat) {
            that.logger.debug('Loaded', path, stat ? stat.versionTag : null, that.logger.ts(ts));
            err = that._convertError(err);
            if (callback) { callback(err, data, stat ? { rev: stat.versionTag } : null); }
        }, _.noop);
    },

    stat: function(path, opts, callback) {
        var that = this;
        that.logger.debug('Stat', path);
        var ts = that.logger.ts();
        path = that._toFullPath(path);
        DropboxLink.stat(path, function(err, stat) {
            if (stat && stat.isRemoved) {
                err = new Error('File removed');
                err.notFound = true;
            }
            that.logger.debug('Stated', path, stat ? stat.versionTag : null, that.logger.ts(ts));
            err = that._convertError(err);
            if (callback) { callback(err, stat ? { rev: stat.versionTag } : null); }
        }, _.noop);
    },

    save: function(path, opts, data, callback, rev) {
        var that = this;
        that.logger.debug('Save', path, rev);
        var ts = that.logger.ts();
        path = that._toFullPath(path);
        DropboxLink.saveFile(path, data, rev, function(err, stat) {
            that.logger.debug('Saved', path, that.logger.ts(ts));
            if (!callback) { return; }
            err = that._convertError(err);
            callback(err, stat ? { rev: stat.versionTag } : null);
        }, _.noop);
    },

    list: function(callback) {
        var that = this;
        DropboxLink.authenticate(function(err) {
            if (err) { return callback(err); }
            DropboxLink.list(that._toFullPath(''), function(err, files, dirStat, filesStat) {
                if (err) { return callback(err); }
                var fileList = filesStat
                    .filter(function(f) {
                        return !f.isFolder && !f.isRemoved && UrlUtil.isKdbx(f.name);
                    })
                    .map(function(f) {
                        return {
                            name: f.name,
                            path: that._toRelPath(f.path),
                            rev: f.versionTag
                        };
                    });
                var dir = dirStat.inAppFolder ? Locale.openAppFolder :
                    (UrlUtil.trimStartSlash(dirStat.path) || Locale.openRootFolder);
                callback(null, fileList, dir);
            });
        });
    },

    remove: function(path, callback) {
        var that = this;
        that.logger.debug('Remove', path);
        var ts = that.logger.ts();
        path = that._toFullPath(path);
        DropboxLink.deleteFile(path, function(err) {
            that.logger.debug('Removed', path, that.logger.ts(ts));
            return callback && callback(err);
        }, _.noop);
    },

    setEnabled: function(enabled) {
        if (!enabled) {
            DropboxLink.logout();
        }
        StorageBase.prototype.setEnabled.call(this, enabled);
    }
});

module.exports = new StorageDropbox();
