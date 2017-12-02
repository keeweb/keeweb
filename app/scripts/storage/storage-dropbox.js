const StorageBase = require('./storage-base');
const UrlUtil = require('../util/url-util');
const FeatureDetector = require('../util/feature-detector');

const DropboxKeys = {
    AppFolder: 'qp7ctun6qt5n9d6',
    FullDropbox: 'eor7hvv6u6oslq9'
};

const DropboxCustomErrors = {
    BadKey: 'bad-key'
};

const StorageDropbox = StorageBase.extend({
    name: 'dropbox',
    icon: 'dropbox',
    enabled: true,
    uipos: 20,
    backup: true,

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

    _getKey: function() {
        return this.appSettings.get('dropboxAppKey') || DropboxKeys.AppFolder;
    },

    _isValidKey: function() {
        const key = this._getKey();
        const isBuiltIn = key === DropboxKeys.AppFolder || key === DropboxKeys.FullDropbox;
        return key && key.indexOf(' ') < 0 && (!isBuiltIn || this._canUseBuiltInKeys());
    },

    _canUseBuiltInKeys: function() {
        return !FeatureDetector.isSelfHosted;
    },

    _getOAuthConfig: function() {
        return {
            scope: '',
            url: 'https://www.dropbox.com/oauth2/authorize',
            clientId: this._getKey(),
            width: 600,
            height: 400
        };
    },

    needShowOpenConfig: function() {
        return !this._isValidKey();
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
        const appKey = this._getKey();
        const linkField = {id: 'link', title: 'dropboxLink', type: 'select', value: 'custom',
            options: { app: 'dropboxLinkApp', full: 'dropboxLinkFull', custom: 'dropboxLinkCustom' } };
        const keyField = {id: 'key', title: 'dropboxAppKey', desc: 'dropboxAppKeyDesc', type: 'text', required: true, pattern: '\\w+',
            value: appKey};
        const folderField = {id: 'folder', title: 'dropboxFolder', desc: 'dropboxFolderSettingsDesc', type: 'text',
            value: this.appSettings.get('dropboxFolder') || ''};
        const canUseBuiltInKeys = this._canUseBuiltInKeys();
        if (canUseBuiltInKeys) {
            fields.push(linkField);
            if (appKey === DropboxKeys.AppFolder) {
                linkField.value = 'app';
            } else if (appKey === DropboxKeys.FullDropbox) {
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
        if (config.key === DropboxKeys.AppFolder || config.key === DropboxKeys.FullDropbox) {
            return callback(DropboxCustomErrors.BadKey);
        }
        // TODO: try to connect using new key
        if (config.folder) {
            config.folder = this._fixConfigFolder(config.folder);
        }
        this.appSettings.set({
            dropboxAppKey: config.key,
            dropboxFolder: config.folder
        });
        callback();
    },

    applySetting: function(key, value) {
        switch (key) {
            case 'link':
                key = 'dropboxAppKey';
                switch (value) {
                    case 'app':
                        value = DropboxKeys.AppFolder;
                        break;
                    case 'full':
                        value = DropboxKeys.FullDropbox;
                        break;
                    case 'custom':
                        value = '(your app key)';
                        break;
                    default:
                        return;
                }
                this._oauthRevokeToken();
                break;
            case 'key':
                key = 'dropboxAppKey';
                this._oauthRevokeToken();
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

    _encodeJsonHttpHeader(json) {
        return json.replace(/[\u007f-\uffff]/g, c => '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4));
    },

    _apiCall: function(args) {
        this._oauthAuthorize(err => {
            if (err) {
                return args.error(err);
            }
            const host = args.host || 'api';
            let headers;
            let data = args.data;
            if (args.apiArg) {
                headers = { 'Dropbox-API-Arg': this._encodeJsonHttpHeader(JSON.stringify(args.apiArg)) };
                if (args.data) {
                    headers['Content-Type'] = 'application/octet-stream';
                }
            } else if (args.data) {
                data = JSON.stringify(data);
                headers = {
                    'Content-Type': 'application/json'
                };
            }
            this._xhr({
                url: `https://${host}.dropboxapi.com/2/${args.method}`,
                method: 'POST',
                responseType: args.responseType || 'json',
                headers: headers,
                data: data,
                statuses: args.statuses || undefined,
                success: args.success,
                error: (e, xhr) => {
                    let err = xhr.response && xhr.response.error || new Error('Network error');
                    if (err && err.path && err.path['.tag'] === 'not_found') {
                        err = new Error('File removed');
                        err.notFound = true;
                        this.logger.debug('File not found', args.method);
                    } else {
                        this.logger.error('API error', args.method, xhr.status, err);
                    }
                    err.status = xhr.status;
                    args.error(err);
                }
            });
        });
    },

    load: function(path, opts, callback) {
        this.logger.debug('Load', path);
        const ts = this.logger.ts();
        path = this._toFullPath(path);
        this._apiCall({
            method: 'files/download',
            host: 'content',
            apiArg: { path },
            responseType: 'arraybuffer',
            success: (response, xhr) => {
                const stat = JSON.parse(xhr.getResponseHeader('dropbox-api-result'));
                this.logger.debug('Loaded', path, stat.rev, this.logger.ts(ts));
                callback(null, response, { rev: stat.rev });
            },
            error: callback
        });
    },

    stat: function(path, opts, callback) {
        this.logger.debug('Stat', path);
        const ts = this.logger.ts();
        path = this._toFullPath(path);
        this._apiCall({
            method: 'files/get_metadata',
            data: { path },
            success: stat => {
                if (stat['.tag'] === 'file') {
                    stat = { rev: stat.rev };
                } else if (stat['.tag'] === 'folder') {
                    stat = { folder: true };
                }
                this.logger.debug('Stated', path, stat.folder ? 'folder' : stat.rev, this.logger.ts(ts));
                if (callback) { callback(null, stat); }
            },
            error: callback
        });
    },

    save: function(path, opts, data, callback, rev) {
        this.logger.debug('Save', path, rev);
        const ts = this.logger.ts();
        path = this._toFullPath(path);
        const arg = {
            path,
            mode: rev ? { '.tag': 'update', update: rev } : { '.tag': 'overwrite' }
        };
        this._apiCall({
            method: 'files/upload',
            host: 'content',
            apiArg: arg,
            data: data,
            responseType: 'json',
            success: stat => {
                this.logger.debug('Saved', path, stat.rev, this.logger.ts(ts));
                callback(null, { rev: stat.rev });
            },
            error: callback
        });
    },

    list: function(dir, callback) {
        this.logger.debug('List');
        const ts = this.logger.ts();
        this._apiCall({
            method: 'files/list_folder',
            data: {
                path: this._toFullPath(dir || ''),
                recursive: false
            },
            success: data => {
                this.logger.debug('Listed', this.logger.ts(ts));
                const fileList = data.entries
                    .map(f => ({
                        name: f.name,
                        path: this._toRelPath(f['path_display']),
                        rev: f.rev,
                        dir: f['.tag'] !== 'file'
                    }));
                callback(null, fileList);
            },
            error: callback
        });
    },

    remove: function(path, callback) {
        this.logger.debug('Remove', path);
        const ts = this.logger.ts();
        path = this._toFullPath(path);
        this._apiCall({
            method: 'files/delete',
            data: { path },
            success: () => {
                this.logger.debug('Removed', path, this.logger.ts(ts));
                callback();
            },
            error: callback
        });
    },

    mkdir: function(path, callback) {
        this.logger.debug('Make dir', path);
        const ts = this.logger.ts();
        path = this._toFullPath(path);
        this._apiCall({
            method: 'files/create_folder',
            data: { path },
            success: () => {
                this.logger.debug('Made dir', path, this.logger.ts(ts));
                callback();
            },
            error: callback
        });
    },

    setEnabled: function(enabled) {
        if (!enabled) {
            this._oauthRevokeToken();
        }
        StorageBase.prototype.setEnabled.call(this, enabled);
    }
});

module.exports = new StorageDropbox();
