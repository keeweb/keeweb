const StorageBase = require('./storage-base');
const Locale = require('../util/locale');

const GDriveClientId = {
    Local: '783608538594-36tkdh8iscrq8t8dq87gghubnhivhjp5.apps.googleusercontent.com',
    Production: '847548101761-koqkji474gp3i2gn3k5omipbfju7pbt1.apps.googleusercontent.com'
};
const NewFileIdPrefix = 'NewFile:';

const StorageGDrive = StorageBase.extend({
    name: 'gdrive',
    enabled: true,
    uipos: 30,
    iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><path d="M86.657536,76.246208 L47.768064,9 L89.111168,' +
        '9 L128,76.246208 L86.657536,76.246208 Z M25.010048,119.08 L102.690048,119.08 L123.36256,83.24 L45.68064,83.24 L25.010048,119.08 L25.010048,' +
        '119.08 Z M38.793088,9.003712 L0,76.30496 L20.671872,112.110016 L59.464704,44.808128 L38.793088,9.003712 Z"></path></svg>',

    _baseUrl: 'https://www.googleapis.com/drive/v3',
    _baseUrlUpload: 'https://www.googleapis.com/upload/drive/v3',

    getPathForName: function(fileName) {
        return NewFileIdPrefix + fileName;
    },

    load: function(path, opts, callback) {
        this.stat(path, opts, (err, stat) => {
            if (err) { return callback && callback(err); }
            this.logger.debug('Load', path);
            const ts = this.logger.ts();
            const url = this._baseUrl + '/files/{id}/revisions/{rev}?alt=media'
                .replace('{id}', path)
                .replace('{rev}', stat.rev);
            this._xhr({
                url: url,
                responseType: 'arraybuffer',
                success: (response) => {
                    this.logger.debug('Loaded', path, stat.rev, this.logger.ts(ts));
                    return callback && callback(null, response, { rev: stat.rev });
                },
                error: (err) => {
                    this.logger.error('Load error', path, err, this.logger.ts(ts));
                    return callback && callback(err);
                }
            });
        });
    },

    stat: function(path, opts, callback) {
        if (path.lastIndexOf(NewFileIdPrefix, 0) === 0) {
            return callback && callback({ notFound: true });
        }
        this._oauthAuthorize(err => {
            if (err) {
                return callback && callback(err);
            }
            this.logger.debug('Stat', path);
            const ts = this.logger.ts();
            const url = this._baseUrl + '/files/{id}?fields=headRevisionId'
                .replace('{id}', path);
            this._xhr({
                url: url,
                responseType: 'json',
                success: (response) => {
                    const rev = response.headRevisionId;
                    this.logger.debug('Stated', path, rev, this.logger.ts(ts));
                    return callback && callback(null, { rev: rev });
                },
                error: (err) => {
                    this.logger.error('Stat error', this.logger.ts(ts), err);
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
            this.stat(path, opts, (err, stat) => {
                if (rev) {
                    if (err) {
                        return callback && callback(err);
                    }
                    if (stat.rev !== rev) {
                        return callback && callback({ revConflict: true }, stat);
                    }
                }
                this.logger.debug('Save', path);
                const ts = this.logger.ts();
                const isNew = path.lastIndexOf(NewFileIdPrefix, 0) === 0;
                let url;
                if (isNew) {
                    url = this._baseUrlUpload + '/files?uploadType=multipart&fields=id,headRevisionId';
                    const fileName = path.replace(NewFileIdPrefix, '') + '.kdbx';
                    const boundry = 'b' + Date.now() + 'x' + Math.round(Math.random() * 1000000);
                    data = new Blob([
                        '--', boundry, '\r\n',
                        'Content-Type: application/json; charset=UTF-8', '\r\n\r\n',
                        JSON.stringify({ name: fileName }), '\r\n',
                        '--', boundry, '\r\n',
                        'Content-Type: application/octet-stream', '\r\n\r\n',
                        data, '\r\n',
                        '--', boundry, '--', '\r\n'
                    ], { type: 'multipart/related; boundary="' + boundry + '"' });
                } else {
                    url = this._baseUrlUpload + '/files/{id}?uploadType=media&fields=headRevisionId'
                        .replace('{id}', path);
                    data = new Blob([data], { type: 'application/octet-stream' });
                }
                this._xhr({
                    url: url,
                    method: isNew ? 'POST' : 'PATCH',
                    responseType: 'json',
                    data: data,
                    success: (response) => {
                        this.logger.debug('Saved', path, this.logger.ts(ts));
                        const newRev = response.headRevisionId;
                        if (!newRev) {
                            return callback && callback('save error: no rev');
                        }
                        return callback && callback(null, { rev: newRev, path: isNew ? response.id : null });
                    },
                    error: (err) => {
                        this.logger.error('Save error', path, err, this.logger.ts(ts));
                        return callback && callback(err);
                    }
                });
            });
        });
    },

    list: function(dir, callback) {
        this._oauthAuthorize((err) => {
            if (err) { return callback && callback(err); }
            this.logger.debug('List');
            let query = dir === 'shared' ? 'sharedWithMe=true'
                : dir ? `"${dir}" in parents` : '"root" in parents';
            query += ' and trashed=false';
            const url = this._baseUrl + '/files?fields={fields}&q={q}&pageSize=1000'
                .replace('{fields}', encodeURIComponent('files(id,name,mimeType,headRevisionId)'))
                .replace('{q}', encodeURIComponent(query));
            const ts = this.logger.ts();
            this._xhr({
                url: url,
                responseType: 'json',
                success: (response) => {
                    if (!response) {
                        this.logger.error('List error', this.logger.ts(ts));
                        return callback && callback('list error');
                    }
                    this.logger.debug('Listed', this.logger.ts(ts));
                    const fileList = response.files.map(f => ({
                        name: f.name,
                        path: f.id,
                        rev: f.headRevisionId,
                        dir: f.mimeType === 'application/vnd.google-apps.folder'
                    }));
                    if (!dir) {
                        fileList.unshift({
                            name: Locale.gdriveSharedWithMe,
                            path: 'shared',
                            rev: undefined,
                            dir: true
                        });
                    }
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
        const url = this._baseUrl + '/files/{id}'.replace('{id}', path);
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

    setEnabled: function(enabled) {
        if (!enabled) {
            this._oauthRevokeToken('https://accounts.google.com/o/oauth2/revoke?token={token}');
        }
        StorageBase.prototype.setEnabled.call(this, enabled);
    },

    _getOAuthConfig: function() {
        let clientId = this.appSettings.get('gdriveClientId');
        if (!clientId) {
            clientId = location.origin.indexOf('localhost') >= 0 ? GDriveClientId.Local : GDriveClientId.Production;
        }
        return {
            scope: 'https://www.googleapis.com/auth/drive',
            url: 'https://accounts.google.com/o/oauth2/v2/auth',
            clientId: clientId,
            width: 600,
            height: 400
        };
    }
});

module.exports = new StorageGDrive();
