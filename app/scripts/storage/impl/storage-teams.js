import { StorageBase } from 'storage/storage-base';
import { MsTeamsApps } from 'const/cloud-storage-apps';
import { Features } from 'util/features';

// https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow

// https://graph.microsoft.com/v1.0/me/transitiveMemberOf/microsoft.graph.group?$count=true
// https://graph.microsoft.com/v1.0/groups?$filter=groupTypes/any(c:c+eq+'Unified')
// https://graph.microsoft.com/v1.0/groups?$filter=groupTypes/any(c:c+eq+'Unified')&$orderby=displayName
// https://graph.microsoft.com/v1.0/groups?$orderby=displayName
// /me/joinedTeams
// https://graph.microsoft.com/v1.0/groups/{group id}/drive/root/children

class StorageTeams extends StorageBase {
    name = 'msteams';
    enabled = true;
    uipos = 50;
    icon = 'user-group';

    _graphUrl = 'https://graph.microsoft.com/v1.0';
    _groupsUrl = `${this._graphUrl}/me/joinedTeams`;
    _baseUrl = `${this._graphUrl}/groups`;

    getPathForName(fileName) {
        return '/drive/root:/' + fileName + '.kdbx';
    }

    genUrlAddress(groupId, path) {
        if (groupId) {
            return this._baseUrl + '/' + groupId + (path ? '/' + path.replace(/^\/+/, '') : '');
        } else {
            return this._groupsUrl;
        }
    }

    genUrl(path) {
        if (!path) {
            const groupId = null;
            const dir = null;
            const url = this.genUrlAddress(groupId, dir);
            return [groupId, dir, url];
        }

        const parts = path.replace(/^\/+/, '').split('/');
        if (parts.length === 0) {
            const groupId = null;
            const dir = null;
            const url = this.genUrlAddress(groupId, dir);
            return [groupId, dir, url];
        } else if (parts.length === 1) {
            const groupId = parts[0];
            const dir = null;
            const url = this.genUrlAddress(groupId, dir);
            return [groupId, dir, url];
        } else {
            path = path.replace(/\/drive\/root\:/, '');
            const groupId = parts[0];
            const dir = ('/' + parts.slice(1).join('/')).replace(/^\/+/, '');
            const url = this.genUrlAddress(groupId, dir);
            return [groupId, dir, url];
        }
    }

    load(path, opts, callback) {
        this._oauthAuthorize((err) => {
            if (err) {
                return callback && callback(err);
            }
            this.logger.debug('Load', path);
            const ts = this.logger.ts();

            const urlParts = this.genUrl(path);
            const groupId = urlParts[0];
            path = urlParts[1];
            const url = urlParts[2];
            if (!groupId) {
                const err = 'no group id defined';
                return callback && callback(err);
            }

            this._xhr({
                url,
                responseType: 'json',
                success: (response) => {
                    const downloadUrl = response['@microsoft.graph.downloadUrl'];
                    let rev = response.eTag;
                    if (!downloadUrl || !response.eTag) {
                        this.logger.debug(
                            'Load error',
                            path,
                            'no download url',
                            response,
                            this.logger.ts(ts)
                        );
                        return callback && callback('no download url');
                    }
                    this._xhr({
                        url: downloadUrl,
                        responseType: 'arraybuffer',
                        skipAuth: true,
                        success: (response, xhr) => {
                            rev = xhr.getResponseHeader('ETag') || rev;
                            this.logger.debug('Loaded', path, rev, this.logger.ts(ts));
                            return callback && callback(null, response, { rev });
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
    }

    stat(path, opts, callback) {
        this._oauthAuthorize((err) => {
            if (err) {
                return callback && callback(err);
            }
            this.logger.debug('Stat', path);
            const ts = this.logger.ts();

            const urlParts = this.genUrl(path);
            const groupId = urlParts[0];
            path = urlParts[1];
            const url = urlParts[2];
            if (!groupId) {
                const err = 'no group id defined';
                return callback && callback(err);
            }

            this._xhr({
                url,
                responseType: 'json',
                success: (response) => {
                    const rev = response.eTag;
                    if (!rev) {
                        this.logger.error('Stat error', path, 'no eTag', this.logger.ts(ts));
                        return callback && callback('no eTag');
                    }
                    this.logger.debug('Stated', path, rev, this.logger.ts(ts));
                    return callback && callback(null, { rev });
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
    }

    save(path, opts, data, callback, rev) {
        this._oauthAuthorize((err) => {
            if (err) {
                return callback && callback(err);
            }
            this.logger.debug('Save', path, rev);
            const ts = this.logger.ts();

            const urlParts = this.genUrl(path);
            const groupId = urlParts[0];
            path = urlParts[1];
            const url = urlParts[2] + ':/content';
            if (!groupId) {
                const err = 'no group id defined';
                return callback && callback(err);
            }

            this._xhr({
                url,
                method: 'PUT',
                responseType: 'json',
                headers: rev ? { 'If-Match': rev } : null,
                data,
                statuses: [200, 201, 412],
                success: (response, xhr) => {
                    rev = response.eTag;
                    if (!rev) {
                        this.logger.error('Save error', path, 'no eTag', this.logger.ts(ts));
                        return callback && callback('no eTag');
                    }
                    if (xhr.status === 412) {
                        this.logger.debug('Save conflict', path, rev, this.logger.ts(ts));
                        return callback && callback({ revConflict: true }, { rev });
                    }
                    this.logger.debug('Saved', path, rev, this.logger.ts(ts));
                    return callback && callback(null, { rev });
                },
                error: (err) => {
                    this.logger.error('Save error', path, err, this.logger.ts(ts));
                    return callback && callback(err);
                }
            });
        });
    }

    list(dir, callback) {
        this._oauthAuthorize((err) => {
            if (err) {
                return callback && callback(err);
            }
            this.logger.debug('List', dir);
            const ts = this.logger.ts();

            const urlParts = this.genUrl(dir);
            const groupId = urlParts[0];
            dir = urlParts[1];
            const urlPath = groupId ? (dir ? ':/children' : '/drive/root/children') : '';
            const url = urlParts[2] + urlPath;

            const self = this;
            self._groupId = groupId;

            this._xhr({
                url,
                responseType: 'json',
                success: (response) => {
                    if (!response || !response.value) {
                        this.logger.error('List error', this.logger.ts(ts), response);
                        return callback && callback('list error');
                    }
                    this.logger.debug('Listed', this.logger.ts(ts));
                    let fileList;
                    if (!self._groupId) {
                        fileList = response.value
                            .filter((f) => f.displayName)
                            .map((f) => ({
                                name: f.displayName,
                                path: '/' + f.id,
                                rev: f.id,
                                dir: true
                            }));
                    } else {
                        fileList = response.value
                            .filter((f) => f.name)
                            .map((f) => ({
                                name: f.name,
                                path: `/${self._groupId}${f.parentReference.path}/${f.name}`,
                                rev: f.eTag,
                                dir: !!f.folder
                            }));
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

        const urlParts = this.genUrl(path);
        const groupId = urlParts[0];
        path = urlParts[1];
        const url = urlParts[2];
        if (!groupId) {
            const err = 'no group id defined';
            return callback && callback(err);
        }

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

    mkdir(path, callback) {
        this._oauthAuthorize((err) => {
            if (err) {
                return callback && callback(err);
            }
            this.logger.debug('Make dir', path);
            const ts = this.logger.ts();

            const urlParts = this.genUrl(path);
            const groupId = urlParts[0];
            path = urlParts[1];
            const url = urlParts[2] + '/drive/root/children';
            if (!groupId) {
                const err = 'no group id defined';
                return callback && callback(err);
            }

            const data = JSON.stringify({ name: path.replace('/drive/root:/', ''), folder: {} });
            this._xhr({
                url,
                method: 'POST',
                responseType: 'json',
                statuses: [200, 204],
                data,
                dataType: 'application/json',
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
    }

    logout(enabled) {
        this._oauthRevokeToken();
    }

    _getOAuthConfig() {
        let clientId = this.appSettings.msteamsClientId;
        let clientSecret = this.appSettings.msteamsClientSecret;
        let tenant = this.appSettings.msteamsTenantId;

        if (!clientId) {
            if (Features.isDesktop) {
                ({ id: clientId, secret: clientSecret, tenantId: tenant } = MsTeamsApps.Desktop);
            } else if (Features.isLocal) {
                ({ id: clientId, secret: clientSecret, tenantId: tenant } = MsTeamsApps.Local);
            } else {
                ({ id: clientId, secret: clientSecret, tenantId: tenant } = MsTeamsApps.Production);
            }
        }
        tenant = tenant || 'common';

        let scope = 'Sites.ReadWrite.All Team.ReadBasic.All';
        if (!this.appSettings.shortLivedStorageToken) {
            scope += ' offline_access';
        }
        return {
            url: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
            tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
            scope,
            clientId,
            clientSecret,
            pkce: true,
            width: 600,
            height: 500
        };
    }
}

export { StorageTeams };
