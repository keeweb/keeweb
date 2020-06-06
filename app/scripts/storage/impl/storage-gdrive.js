import { StorageBase } from 'storage/storage-base';
import { Locale } from 'util/locale';
import { Features } from 'util/features';
import { GDriveApps } from 'const/cloud-storage-apps';

const NewFileIdPrefix = 'NewFile:';

// https://developers.google.com/identity/protocols/oauth2/web-server

class StorageGDrive extends StorageBase {
    name = 'gdrive';
    enabled = true;
    uipos = 30;
    iconSvg = 'google-drive';

    _baseUrl = 'https://www.googleapis.com/drive/v3';
    _baseUrlUpload = 'https://www.googleapis.com/upload/drive/v3';

    getPathForName(fileName) {
        return NewFileIdPrefix + fileName;
    }

    load(path, opts, callback) {
        this.stat(path, opts, (err, stat) => {
            if (err) {
                return callback && callback(err);
            }
            this.logger.debug('Load', path);
            const ts = this.logger.ts();
            const url =
                this._baseUrl +
                '/files/{id}/revisions/{rev}?alt=media'
                    .replace('{id}', path)
                    .replace('{rev}', stat.rev);
            this._xhr({
                url,
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
    }

    stat(path, opts, callback) {
        if (path.lastIndexOf(NewFileIdPrefix, 0) === 0) {
            return callback && callback({ notFound: true });
        }
        this._oauthAuthorize((err) => {
            if (err) {
                return callback && callback(err);
            }
            this.logger.debug('Stat', path);
            const ts = this.logger.ts();
            const url = this._baseUrl + '/files/{id}?fields=headRevisionId'.replace('{id}', path);
            this._xhr({
                url,
                responseType: 'json',
                success: (response) => {
                    const rev = response.headRevisionId;
                    this.logger.debug('Stated', path, rev, this.logger.ts(ts));
                    return callback && callback(null, { rev });
                },
                error: (err) => {
                    this.logger.error('Stat error', this.logger.ts(ts), err);
                    return callback && callback(err);
                }
            });
        });
    }

    save(path, opts, data, callback, rev) {
        this._oauthAuthorize((err) => {
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
                let dataType;
                let dataIsMultipart = false;
                if (isNew) {
                    url =
                        this._baseUrlUpload +
                        '/files?uploadType=multipart&fields=id,headRevisionId';
                    const fileName = path.replace(NewFileIdPrefix, '') + '.kdbx';
                    const boundary = 'b' + Date.now() + 'x' + Math.round(Math.random() * 1000000);
                    data = [
                        '--',
                        boundary,
                        '\r\n',
                        'Content-Type: application/json; charset=UTF-8',
                        '\r\n\r\n',
                        JSON.stringify({ name: fileName }),
                        '\r\n',
                        '--',
                        boundary,
                        '\r\n',
                        'Content-Type: application/octet-stream',
                        '\r\n\r\n',
                        data,
                        '\r\n',
                        '--',
                        boundary,
                        '--',
                        '\r\n'
                    ];
                    dataType = 'multipart/related; boundary="' + boundary + '"';
                    dataIsMultipart = true;
                } else {
                    url =
                        this._baseUrlUpload +
                        '/files/{id}?uploadType=media&fields=headRevisionId'.replace('{id}', path);
                }
                this._xhr({
                    url,
                    method: isNew ? 'POST' : 'PATCH',
                    responseType: 'json',
                    data,
                    dataType,
                    dataIsMultipart,
                    success: (response) => {
                        this.logger.debug('Saved', path, this.logger.ts(ts));
                        const newRev = response.headRevisionId;
                        if (!newRev) {
                            return callback && callback('save error: no rev');
                        }
                        return (
                            callback &&
                            callback(null, { rev: newRev, path: isNew ? response.id : null })
                        );
                    },
                    error: (err) => {
                        this.logger.error('Save error', path, err, this.logger.ts(ts));
                        return callback && callback(err);
                    }
                });
            });
        });
    }

    list(dir, callback) {
        this._oauthAuthorize((err) => {
            if (err) {
                return callback && callback(err);
            }
            this.logger.debug('List');
            let query =
                dir === 'shared'
                    ? 'sharedWithMe=true'
                    : dir
                    ? `"${dir}" in parents`
                    : '"root" in parents';
            query += ' and trashed=false';
            const url =
                this._baseUrl +
                '/files?fields={fields}&q={q}&pageSize=1000'
                    .replace(
                        '{fields}',
                        encodeURIComponent('files(id,name,mimeType,headRevisionId)')
                    )
                    .replace('{q}', encodeURIComponent(query));
            const ts = this.logger.ts();
            this._xhr({
                url,
                responseType: 'json',
                success: (response) => {
                    if (!response) {
                        this.logger.error('List error', this.logger.ts(ts));
                        return callback && callback('list error');
                    }
                    this.logger.debug('Listed', this.logger.ts(ts));
                    const fileList = response.files.map((f) => ({
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
    }

    remove(path, callback) {
        this.logger.debug('Remove', path);
        const ts = this.logger.ts();
        const url = this._baseUrl + '/files/{id}'.replace('{id}', path);
        this._xhr({
            url,
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
    }

    logout() {
        this._oauthRevokeToken('https://accounts.google.com/o/oauth2/revoke?token={token}');
    }

    _getOAuthConfig() {
        let clientId = this.appSettings.gdriveClientId;
        let clientSecret = this.appSettings.gdriveClientSecret;
        if (!clientId || !clientSecret) {
            if (Features.isDesktop) {
                ({ id: clientId, secret: clientSecret } = GDriveApps.Desktop);
            } else if (Features.isLocal) {
                ({ id: clientId, secret: clientSecret } = GDriveApps.Local);
            } else {
                ({ id: clientId, secret: clientSecret } = GDriveApps.Production);
            }
        }
        return {
            scope: 'https://www.googleapis.com/auth/drive',
            url: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            clientId,
            clientSecret,
            width: 600,
            height: 400,
            pkce: true,
            redirectUrlParams: {
                'access_type': 'offline'
            }
        };
    }
}

export { StorageGDrive };
