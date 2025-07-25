import { StorageBase } from 'storage/storage-base';
import { Features } from 'util/features';
import { UrlFormat } from 'util/formatting/url-format';
import { DropboxApps } from 'const/cloud-storage-apps';
import { Locale } from 'util/locale';

const DropboxCustomErrors = {
    BadKey: 'bad-key'
};

// https://www.dropbox.com/developers/documentation/http/documentation#oauth2-authorize

class StorageDropbox extends StorageBase {
    name = 'dropbox';
    icon = 'dropbox';
    enabled = true;
    uipos = 20;
    backup = true;

    _toFullPath(path) {
        const rootFolder = this.appSettings.dropboxFolder;
        if (rootFolder) {
            path = UrlFormat.fixSlashes('/' + rootFolder + '/' + path);
        }
        return path;
    }

    _toRelPath(path) {
        const rootFolder = this.appSettings.dropboxFolder;
        if (rootFolder) {
            const ix = path.toLowerCase().indexOf(rootFolder.toLowerCase());
            if (ix === 0) {
                path = path.substr(rootFolder.length);
            } else if (ix === 1) {
                path = path.substr(rootFolder.length + 1);
            }
            path = UrlFormat.fixSlashes('/' + path);
        }
        return path;
    }

    _fixConfigFolder(folder) {
        folder = folder.replace(/\\/g, '/').trim();
        if (folder[0] === '/') {
            folder = folder.substr(1);
        }
        return folder;
    }

    _getKey() {
        return this.appSettings.dropboxAppKey || DropboxApps.AppFolder.id;
    }

    _getSecret() {
        const key = this._getKey();
        if (key === DropboxApps.AppFolder.id) {
            return DropboxApps.AppFolder.secret;
        }
        if (key === DropboxApps.FullDropbox.id) {
            return DropboxApps.FullDropbox.secret;
        }
        return this.appSettings.dropboxSecret;
    }

    _isValidKey() {
        const key = this._getKey();
        const isBuiltIn = key === DropboxApps.AppFolder.id || key === DropboxApps.FullDropbox.id;
        return key && key.indexOf(' ') < 0 && (!isBuiltIn || this._canUseBuiltInKeys());
    }

    _canUseBuiltInKeys() {
        return !Features.isSelfHosted;
    }

    _getOAuthConfig() {
        return {
            scope:
                'files.content.read files.content.write files.metadata.read files.metadata.write',
            url: 'https://www.dropbox.com/oauth2/authorize',
            tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
            clientId: this._getKey(),
            clientSecret: this._getSecret(),
            pkce: true,
            width: 600,
            height: 400,
            urlParams: this.appSettings.shortLivedStorageToken
                ? {}
                : { 'token_access_type': 'offline' }
        };
    }

    needShowOpenConfig() {
        return !this._isValidKey() || !this._getSecret();
    }

    getOpenConfig() {
        return {
            desc: 'dropboxSetupDesc',
            fields: [
                {
                    id: 'key',
                    title: 'dropboxAppKey',
                    desc: 'dropboxAppKeyDesc',
                    type: 'text',
                    required: true,
                    pattern: '\\w+'
                },
                {
                    id: 'secret',
                    title: 'dropboxAppSecret',
                    desc: 'dropboxAppSecretDesc',
                    type: 'password',
                    required: true,
                    pattern: '\\w+'
                },
                {
                    id: 'folder',
                    title: 'dropboxFolder',
                    desc: 'dropboxFolderDesc',
                    type: 'text',
                    placeholder: 'dropboxFolderPlaceholder'
                }
            ]
        };
    }

    getSettingsConfig() {
        const fields = [];
        const appKey = this._getKey();
        const linkField = {
            id: 'link',
            title: 'dropboxLink',
            type: 'select',
            value: 'custom',
            options: { app: 'dropboxLinkApp', full: 'dropboxLinkFull', custom: 'dropboxLinkCustom' }
        };
        const keyField = {
            id: 'key',
            title: 'dropboxAppKey',
            desc: 'dropboxAppKeyDesc',
            type: 'text',
            required: true,
            pattern: '\\w+',
            value: appKey
        };
        const secretField = {
            id: 'secret',
            title: 'dropboxAppSecret',
            desc: 'dropboxAppSecretDesc',
            type: 'password',
            required: true,
            pattern: '\\w+',
            value: this.appSettings.dropboxSecret || ''
        };
        const folderField = {
            id: 'folder',
            title: 'dropboxFolder',
            desc: 'dropboxFolderSettingsDesc',
            type: 'text',
            value: this.appSettings.dropboxFolder || ''
        };
        const canUseBuiltInKeys = this._canUseBuiltInKeys();
        if (canUseBuiltInKeys) {
            fields.push(linkField);
            if (appKey === DropboxApps.AppFolder.id) {
                linkField.value = 'app';
            } else if (appKey === DropboxApps.FullDropbox.id) {
                linkField.value = 'full';
                fields.push(folderField);
            } else {
                fields.push(keyField);
                fields.push(secretField);
                fields.push(folderField);
            }
        } else {
            fields.push(keyField);
            fields.push(secretField);
            fields.push(folderField);
        }
        return { fields };
    }

    applyConfig(config, callback) {
        if (config.key === DropboxApps.AppFolder.id || config.key === DropboxApps.FullDropbox.id) {
            return callback(DropboxCustomErrors.BadKey);
        }
        // TODO: try to connect using new key
        if (config.folder) {
            config.folder = this._fixConfigFolder(config.folder);
        }
        this.appSettings.set({
            dropboxAppKey: config.key,
            dropboxSecret: config.secret,
            dropboxFolder: config.folder
        });
        callback();
    }

    applySetting(key, value) {
        switch (key) {
            case 'link':
                key = 'dropboxAppKey';
                switch (value) {
                    case 'app':
                        value = DropboxApps.AppFolder.id;
                        break;
                    case 'full':
                        value = DropboxApps.FullDropbox.id;
                        break;
                    case 'custom':
                        value = `(${Locale.dropboxAppKeyHint})`;
                        break;
                    default:
                        return;
                }
                this.logout();
                break;
            case 'key':
                key = 'dropboxAppKey';
                this.logout();
                break;
            case 'secret':
                key = 'dropboxSecret';
                this.logout();
                break;
            case 'folder':
                key = 'dropboxFolder';
                value = this._fixConfigFolder(value);
                break;
            default:
                return;
        }
        this.appSettings[key] = value;
    }

    getPathForName(fileName) {
        return '/' + fileName + '.kdbx';
    }

    _encodeJsonHttpHeader(json) {
        return json.replace(
            /[\u007f-\uffff]/g,
            (c) => '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4)
        );
    }

    _apiCall(args) {
        this._oauthAuthorize((err) => {
            if (err) {
                return args.error(err);
            }
            const host = args.host || 'api';
            let headers;
            let data = args.data;
            let dataType;
            if (args.apiArg) {
                headers = {
                    'Dropbox-API-Arg': this._encodeJsonHttpHeader(JSON.stringify(args.apiArg))
                };
            } else if (args.data) {
                data = JSON.stringify(data);
                dataType = 'application/json';
            }
            this._xhr({
                url: `https://${host}.dropboxapi.com/2/${args.method}`,
                method: 'POST',
                responseType: args.responseType || 'json',
                headers,
                data,
                dataType,
                statuses: args.statuses || undefined,
                success: args.success,
                error: (e, xhr) => {
                    let err = (xhr.response && xhr.response.error) || new Error('Network error');
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
    }

    load(path, opts, callback) {
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
    }

    stat(path, opts, callback) {
        this.logger.debug('Stat', path);
        const ts = this.logger.ts();
        path = this._toFullPath(path);
        this._apiCall({
            method: 'files/get_metadata',
            data: { path },
            success: (stat) => {
                if (stat['.tag'] === 'file') {
                    stat = { rev: stat.rev };
                } else if (stat['.tag'] === 'folder') {
                    stat = { folder: true };
                }
                this.logger.debug(
                    'Stated',
                    path,
                    stat.folder ? 'folder' : stat.rev,
                    this.logger.ts(ts)
                );
                if (callback) {
                    callback(null, stat);
                }
            },
            error: callback
        });
    }

    save(path, opts, data, callback, rev) {
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
            data,
            responseType: 'json',
            success: (stat) => {
                this.logger.debug('Saved', path, stat.rev, this.logger.ts(ts));
                callback(null, { rev: stat.rev });
            },
            error: callback
        });
    }

    list(dir, callback) {
        this.logger.debug('List');
        const ts = this.logger.ts();
        this._apiCall({
            method: 'files/list_folder',
            data: {
                path: this._toFullPath(dir || ''),
                recursive: false
            },
            success: (data) => {
                this.logger.debug('Listed', this.logger.ts(ts));
                const fileList = data.entries.map((f) => ({
                    name: f.name,
                    path: this._toRelPath(f.path_display),
                    rev: f.rev,
                    dir: f['.tag'] !== 'file'
                }));
                callback(null, fileList);
            },
            error: callback
        });
    }

    remove(path, callback) {
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
    }

    mkdir(path, callback) {
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
    }

    logout() {
        this._oauthRevokeToken('https://api.dropboxapi.com/2/auth/token/revoke', {
            method: 'POST'
        });
    }
}

export { StorageDropbox };
