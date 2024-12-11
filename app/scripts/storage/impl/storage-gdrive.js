import { StorageBase } from 'storage/storage-base';
import { Locale } from 'util/locale';
import { Features } from 'util/features';
import { UrlFormat } from 'util/formatting/url-format';
import { GDriveApps } from 'const/cloud-storage-apps';

const NewFileIdPrefix = 'NewFile:';

// https://developers.google.com/identity/protocols/oauth2/web-server

class StorageGDrive extends StorageBase {
    name = 'gdrive';
    enabled = true;
    uipos = 30;
    icon = 'google-drive';

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
            const url = UrlFormat.makeUrl(`${this._baseUrl}/files/${path}/revisions/${stat.rev}`, {
                'alt': 'media'
            });
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
            const url = UrlFormat.makeUrl(`${this._baseUrl}/files/${path}`, {
                fields: 'headRevisionId',
                includeItemsFromAllDrives: true,
                supportsAllDrives: true
            });
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
                    url = UrlFormat.makeUrl(`${this._baseUrlUpload}/files`, {
                        uploadType: 'multipart',
                        fields: 'id,headRevisionId',
                        includeItemsFromAllDrives: true,
                        supportsAllDrives: true
                    });
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
                    url = UrlFormat.makeUrl(`${this._baseUrlUpload}/files/${path}`, {
                        uploadType: 'media',
                        fields: 'headRevisionId',
                        includeItemsFromAllDrives: true,
                        supportsAllDrives: true
                    });
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

            const ts = this.logger.ts();

            if (dir === 'drives') {
                const urlParams = {
                    pageSize: 100
                };

                const url = UrlFormat.makeUrl(`${this._baseUrl}/drives`, urlParams);

                this._xhr({
                    url,
                    responseType: 'json',
                    success: (response) => {
                        if (!response) {
                            this.logger.error('Drive list error', this.logger.ts(ts));
                            return callback?.('drive list error');
                        }
                        this.logger.debug('Listed drives', this.logger.ts(ts));

                        const fileList = response.drives.map((d) => ({
                            name: d.name,
                            path: d.id,
                            dir: true
                        }));
                        return callback?.(null, fileList);
                    },
                    error: (err) => {
                        this.logger.error('Drive dist error', this.logger.ts(ts), err);
                        return callback?.(err);
                    }
                });
            } else {
                let query = 'trashed=false and ';
                if (dir === 'shared') {
                    query += 'sharedWithMe=true';
                } else if (dir) {
                    query += `"${dir}" in parents`;
                } else {
                    query += '"root" in parents';
                }

                const urlParams = {
                    fields: 'files(id,name,mimeType,headRevisionId,shortcutDetails)',
                    q: query,
                    pageSize: 1000,
                    includeItemsFromAllDrives: true,
                    supportsAllDrives: true
                };

                const url = UrlFormat.makeUrl(`${this._baseUrl}/files`, urlParams);

                this._xhr({
                    url,
                    responseType: 'json',
                    success: (response) => {
                        if (!response) {
                            this.logger.error('List error', this.logger.ts(ts));
                            return callback?.('list error');
                        }
                        this.logger.debug('Listed', this.logger.ts(ts));

                        const fileList = response.files.map((f) => ({
                            name: f.name,
                            path: f.shortcutDetails?.targetId ?? f.id,
                            rev: f.headRevisionId,
                            dir:
                                f.mimeType === 'application/vnd.google-apps.folder' ||
                                f.shortcutDetails?.targetMimeType ===
                                    'application/vnd.google-apps.folder'
                        }));
                        if (!dir) {
                            fileList.unshift({
                                name: Locale.gdriveSharedWithMe,
                                path: 'shared',
                                rev: undefined,
                                dir: true
                            });
                            fileList.unshift({
                                name: Locale.gdriveSharedDrives,
                                path: 'drives',
                                rev: undefined,
                                dir: true
                            });
                        }
                        return callback?.(null, fileList);
                    },
                    error: (err) => {
                        this.logger.error('List error', this.logger.ts(ts), err);
                        return callback?.(err);
                    }
                });
            }
        });
    }

    remove(path, callback) {
        this.logger.debug('Remove', path);
        const ts = this.logger.ts();
        const url = `${this._baseUrl}/files/${path}`;
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
            // @ref https://github.com/keeweb/keeweb/pull/2208/
            // scope: 'https://www.googleapis.com/auth/drive',
            scope: 'https://www.googleapis.com/auth/drive.file',
            url: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            clientId,
            clientSecret,
            width: 600,
            height: 400,
            pkce: true,
            urlParams: this.appSettings.shortLivedStorageToken ? {} : { 'access_type': 'offline' }
        };
    }
}

export { StorageGDrive };
