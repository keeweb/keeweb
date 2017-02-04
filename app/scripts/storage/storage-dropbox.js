'use strict';

const StorageBase = require('./storage-base');
const DropboxLink = require('../comp/dropbox-link');
const Locale = require('../util/locale');
const UrlUtil = require('../util/url-util');

const StorageDropbox = StorageBase.extend({
    name: 'dropbox',
    icon: 'dropbox',
    enabled: true,
    uipos: 20,
    backup: true,

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
        const rootFolder = this.appSettings.get('dropboxFolder');
        if (rootFolder) {
            path = UrlUtil.fixSlashes('/' + rootFolder + '/' + path);
        }
        return path;
    },

    _toRelPath: function(path) {
        const rootFolder = this.appSettings.get('dropboxFolder');
        if (rootFolder) {
            const ix = path.toLowerCase().indexOf(rootFolder.toLowerCase());
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
        const fields = [];
        const appKey = DropboxLink.getKey();
        const linkField = {id: 'link', title: 'dropboxLink', type: 'select', value: 'custom',
            options: { app: 'dropboxLinkApp', full: 'dropboxLinkFull', custom: 'dropboxLinkCustom' } };
        const keyField = {id: 'key', title: 'dropboxAppKey', desc: 'dropboxAppKeyDesc', type: 'text', required: true, pattern: '\\w+',
            value: appKey};
        const folderField = {id: 'folder', title: 'dropboxFolder', desc: 'dropboxFolderSettingsDesc', type: 'text',
            value: this.appSettings.get('dropboxFolder') || ''};
        const canUseBuiltInKeys = DropboxLink.canUseBuiltInKeys();
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
        DropboxLink.authenticate(err => {
            if (!err) {
                if (config.folder) {
                    config.folder = this._fixConfigFolder(config.folder);
                }
                this.appSettings.set({
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
        this.logger.debug('Load', path);
        const ts = this.logger.ts();
        path = this._toFullPath(path);
        DropboxLink.openFile(path, (err, data, stat) => {
            this.logger.debug('Loaded', path, stat ? stat.versionTag : null, this.logger.ts(ts));
            err = this._convertError(err);
            if (callback) { callback(err, data, stat ? { rev: stat.versionTag } : null); }
        }, _.noop);
    },

    stat: function(path, opts, callback) {
        this.logger.debug('Stat', path);
        const ts = this.logger.ts();
        path = this._toFullPath(path);
        DropboxLink.stat(path, (err, stat) => {
            if (stat && stat.isRemoved) {
                err = new Error('File removed');
                err.notFound = true;
            }
            this.logger.debug('Stated', path, stat ? stat.versionTag : null, this.logger.ts(ts));
            err = this._convertError(err);
            if (callback) { callback(err, stat ? { rev: stat.versionTag } : null); }
        }, _.noop);
    },

    save: function(path, opts, data, callback, rev) {
        this.logger.debug('Save', path, rev);
        const ts = this.logger.ts();
        path = this._toFullPath(path);
        DropboxLink.saveFile(path, data, rev, (err, stat) => {
            this.logger.debug('Saved', path, this.logger.ts(ts));
            if (!callback) { return; }
            err = this._convertError(err);
            callback(err, stat ? { rev: stat.versionTag } : null);
        }, _.noop);
    },

    list: function(callback) {
        DropboxLink.authenticate((err) => {
            if (err) { return callback(err); }
            DropboxLink.list(this._toFullPath(''), (err, files, dirStat, filesStat) => {
                if (err) { return callback(err); }
                const fileList = filesStat
                    .filter(f => !f.isFolder && !f.isRemoved && UrlUtil.isKdbx(f.name))
                    .map(f => ({
                        name: f.name,
                        path: this._toRelPath(f.path),
                        rev: f.versionTag
                    }));
                const dir = dirStat.inAppFolder ? Locale.openAppFolder
                    : (UrlUtil.trimStartSlash(dirStat.path) || Locale.openRootFolder);
                callback(null, fileList, dir);
            });
        });
    },

    remove: function(path, callback) {
        this.logger.debug('Remove', path);
        const ts = this.logger.ts();
        path = this._toFullPath(path);
        DropboxLink.deleteFile(path, err => {
            this.logger.debug('Removed', path, this.logger.ts(ts));
            return callback && callback(err);
        }, _.noop);
    },

    mkdir: function(path, callback) {
        DropboxLink.authenticate((err) => {
            if (err) { return callback(err); }
            this.logger.debug('Make dir', path);
            const ts = this.logger.ts();
            path = this._toFullPath(path);
            DropboxLink.mkdir(path, err => {
                this.logger.debug('Made dir', path, this.logger.ts(ts));
                return callback && callback(err);
            }, _.noop);
        });
    },

    setEnabled: function(enabled) {
        if (!enabled) {
            DropboxLink.logout();
        }
        StorageBase.prototype.setEnabled.call(this, enabled);
    }
});

module.exports = new StorageDropbox();
