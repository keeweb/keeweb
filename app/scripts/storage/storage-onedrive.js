const StorageBase = require('./storage-base');

const OneDriveClientId = {
    Production: '000000004818ED3A',
    Local: '0000000044183D18'
};

const StorageOneDrive = StorageBase.extend({
    name: 'onedrive',
    enabled: true,
    uipos: 40,
    iconSvg: '<svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="256" height="256" version="1.1" viewBox="0 0 256 256">' +
        '<g transform="translate(296.64282,-100.61434)"><g transform="translate(222.85714,-11.428576)"><g transform="matrix(0.83394139,0,0,0.83394139,' +
        '-86.101383,10.950635)"><path d="m-419.5 365.94c-18.48-4.62-28.77-19.31-28.81-41.1-0.01-6.97 0.49-10.31 2.23-14.79 4.26-10.99 15.55-19.27 ' +
        '30.41-22.33 7.39-1.52 9.67-3.15 9.67-6.92 0-1.18 0.88-4.71 1.95-7.83 4.88-14.2 13.93-26.03 23.59-30.87 10.11-5.07 15.22-6.21 27.45-6.14 17.38 ' +
        '0.09 26.04 3.86 38.17 16.6l6.67 7 5.97-2.07c28.91-10.01 57.73 7.03 60.06 35.49l0.64 7.79 5.69 2.04c16.26 5.83 23.9 18.06 22.52 36.04-0.91 11.76-6.4 ' +
        '21.15-15.11 25.81l-4.09 2.19-91 0.18c-69.93 0.13-92.16-0.11-96-1.07zM-487.72 353.36" fill="#000"/><path d="m-487.72 353.36c-10.79-2.56-22.22-12.09-' +
        '27.58-22.99-3.04-6.18-3.2-7.09-3.2-18.03 0-10.4 0.26-12.07 2.68-17.23 5.1-10.89 14.88-18.75 27.15-21.84 2.59-0.65 5.02-1.69 5.41-2.31 0.38-0.62 ' +
        '0.81-4 0.95-7.5 0.85-21.78 15.15-40.97 35.1-47.14 10.78-3.33 24.33-2.51 36.05 2.18 3.72 1.49 3.3 1.81 11.16-8.5 4.65-6.1 14.05-13.68 21.74-17.55 ' +
        '8.3-4.17 16.94-6.09 27.26-6.07 28.86 0.07 53.73 18.12 62.92 45.67 2.94 8.8 2.79 11.27-0.67 11.34-1.51 0.03-5.85 0.86-9.63 1.85l-6.88 1.79-6.28-' +
        '6.28c-17.7-17.7-46.59-21.53-71.15-9.42-9.81 4.84-17.7 11.78-23.65 20.83-4.25 6.45-9.66 18.48-9.66 21.47 0 2.12-1.72 3.18-9.05 5.58-22.69 7.44-' +
        '35.94 24.63-35.93 46.62 0 8 2.06 17.8 4.93 23.41 1.08 2.11 1.68 4.13 1.34 4.47-0.88 0.88-29.11 0.58-33.01-0.35z" /></g></g></g></svg>',

    _baseUrl: 'https://graph.microsoft.com/v1.0/me',

    getPathForName: function(fileName) {
        return '/drive/root:/' + fileName + '.kdbx';
    },

    load: function(path, opts, callback) {
        this._oauthAuthorize(err => {
            if (err) {
                return callback && callback(err);
            }
            this.logger.debug('Load', path);
            const ts = this.logger.ts();
            const url = this._baseUrl + path;
            this._xhr({
                url: url,
                responseType: 'json',
                success: (response) => {
                    const downloadUrl = response['@microsoft.graph.downloadUrl'];
                    let rev = response.eTag;
                    if (!downloadUrl || !response.eTag) {
                        this.logger.debug('Load error', path, 'no download url', response, this.logger.ts(ts));
                        return callback && callback('no download url');
                    }
                    this._xhr({
                        url: downloadUrl,
                        responseType: 'arraybuffer',
                        skipAuth: true,
                        success: (response, xhr) => {
                            rev = xhr.getResponseHeader('ETag') || rev;
                            this.logger.debug('Loaded', path, rev, this.logger.ts(ts));
                            return callback && callback(null, response, {rev: rev});
                        },
                        error: (err) => {
                            this.logger.error('Load error', path, err, this.logger.ts(ts));
                            return callback && callback(err);
                        }
                    });
                },
                error: (err) => {
                    this.logger.error('Load error', path, err, this.logger.ts(ts));
                    return callback && callback(err);
                }
            });
        });
    },

    stat: function(path, opts, callback) {
        this._oauthAuthorize(err => {
            if (err) {
                return callback && callback(err);
            }
            this.logger.debug('Stat', path);
            const ts = this.logger.ts();
            const url = this._baseUrl + path;
            this._xhr({
                url: url,
                responseType: 'json',
                success: (response) => {
                    const rev = response.eTag;
                    if (!rev) {
                        this.logger.error('Stat error', path, 'no eTag', this.logger.ts(ts));
                        return callback && callback('no eTag');
                    }
                    this.logger.debug('Stated', path, rev, this.logger.ts(ts));
                    return callback && callback(null, {rev: rev});
                },
                error: (err, xhr) => {
                    if (xhr.status === 404) {
                        this.logger.debug('Stated not found', path, this.logger.ts(ts));
                        return callback && callback({ notFound: true });
                    }
                    this.logger.error('Stat error', path, err, this.logger.ts(ts));
                    return callback && callback(err);
                }
            });
        });
    },

    save: function(path, opts, data, callback, rev) {
        this._oauthAuthorize(err => {
            if (err) {
                return callback && callback(err);
            }
            this.logger.debug('Save', path, rev);
            const ts = this.logger.ts();
            const url = this._baseUrl + path + ':/content';
            this._xhr({
                url: url,
                method: 'PUT',
                responseType: 'json',
                headers: rev ? { 'If-Match': rev } : null,
                data: new Blob([data], {type: 'application/octet-stream'}),
                statuses: [200, 201, 412],
                success: (response, xhr) => {
                    rev = response.eTag;
                    if (!rev) {
                        this.logger.error('Save error', path, 'no eTag', this.logger.ts(ts));
                        return callback && callback('no eTag');
                    }
                    if (xhr.status === 412) {
                        this.logger.debug('Save conflict', path, rev, this.logger.ts(ts));
                        return callback && callback({ revConflict: true }, { rev: rev });
                    }
                    this.logger.debug('Saved', path, rev, this.logger.ts(ts));
                    return callback && callback(null, {rev: rev});
                },
                error: (err) => {
                    this.logger.error('Save error', path, err, this.logger.ts(ts));
                    return callback && callback(err);
                }
            });
        });
    },

    list: function(dir, callback) {
        this._oauthAuthorize(err => {
            if (err) { return callback && callback(err); }
            this.logger.debug('List');
            const ts = this.logger.ts();
            const url = this._baseUrl + (dir ? `${dir}:/children` : '/drive/root/children');
            this._xhr({
                url: url,
                responseType: 'json',
                success: (response) => {
                    if (!response || !response.value) {
                        this.logger.error('List error', this.logger.ts(ts), response);
                        return callback && callback('list error');
                    }
                    this.logger.debug('Listed', this.logger.ts(ts));
                    const fileList = response.value
                        .filter(f => f.name)
                        .map(f => ({
                            name: f.name,
                            path: f.parentReference.path + '/' + f.name,
                            rev: f.eTag,
                            dir: !!f.folder
                        }));
                    return callback && callback(null, fileList);
                },
                error: (err) => {
                    this.logger.error('List error', this.logger.ts(ts), err);
                    return callback && callback(err);
                }
            });
        });
    },

    remove: function(path, callback) {
        this.logger.debug('Remove', path);
        const ts = this.logger.ts();
        const url = this._baseUrl + path;
        this._xhr({
            url: url,
            method: 'DELETE',
            responseType: 'json',
            statuses: [200, 204],
            success: () => {
                this.logger.debug('Removed', path, this.logger.ts(ts));
                return callback && callback();
            },
            error: (err) => {
                this.logger.error('Remove error', path, err, this.logger.ts(ts));
                return callback && callback(err);
            }
        });
    },

    mkdir: function(path, callback) {
        this._oauthAuthorize(err => {
            if (err) { return callback && callback(err); }
            this.logger.debug('Make dir', path);
            const ts = this.logger.ts();
            const url = this._baseUrl + '/drive/root/children';
            const data = JSON.stringify({ name: path.replace('/drive/root:/', ''), folder: {} });
            this._xhr({
                url: url,
                method: 'POST',
                responseType: 'json',
                statuses: [200, 204],
                data: new Blob([data], {type: 'application/json'}),
                success: () => {
                    this.logger.debug('Made dir', path, this.logger.ts(ts));
                    return callback && callback();
                },
                error: (err) => {
                    this.logger.error('Make dir error', path, err, this.logger.ts(ts));
                    return callback && callback(err);
                }
            });
        });
    },

    setEnabled: function(enabled) {
        if (!enabled) {
            const url = 'https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri={url}'
                .replace('{url}', this._getOauthRedirectUrl());
            this._oauthRevokeToken(url);
        }
        StorageBase.prototype.setEnabled.call(this, enabled);
    },

    _getClientId: function() {
        let clientId = this.appSettings.get('onedriveClientId');
        if (!clientId) {
            clientId = location.origin.indexOf('localhost') >= 0 ? OneDriveClientId.Local : OneDriveClientId.Production;
        }
        return clientId;
    },

    _getOAuthConfig: function() {
        const clientId = this._getClientId();
        return {
            url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            scope: 'files.readwrite',
            clientId: clientId,
            width: 600,
            height: 500
        };
    },

    _popupOpened(popupWindow) {
        if (popupWindow.webContents) {
            popupWindow.webContents.on('did-finish-load', (e) => {
                const webContents = e.sender.webContents;
                const url = webContents.getURL();
                if (url && url.startsWith('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')) {
                    // click the login button mentioned in #821
                    const script =
`const selector = '[role="button"][aria-describedby="tileError loginHeader"]';
if (document.querySelectorAll(selector).length === 1) document.querySelector(selector).click()`;
                    webContents.executeJavaScript(script).catch(() => {});
                }
            });
        }
    }
});

module.exports = new StorageOneDrive();
