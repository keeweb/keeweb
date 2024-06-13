import * as kdbxweb from 'kdbxweb';
import { StorageBase } from 'storage/storage-base';
import { Locale } from 'util/locale';

class StorageWebDav extends StorageBase {
    name = 'webdav';
    icon = 'server';
    enabled = true;
    uipos = 10;

    needShowOpenConfig() {
        return true;
    }

    getOpenConfig() {
        return {
            fields: [
                {
                    id: 'path',
                    title: 'openUrl',
                    desc: 'openUrlDesc',
                    type: 'text',
                    required: true,
                    pattern: '^https://.+'
                },
                {
                    id: 'user',
                    title: 'openUser',
                    desc: 'openUserDesc',
                    placeholder: 'openUserPlaceholder',
                    type: 'text'
                },
                {
                    id: 'password',
                    title: 'openPass',
                    desc: 'openPassDesc',
                    placeholder: 'openPassPlaceholder',
                    type: 'password'
                }
            ]
        };
    }

    getSettingsConfig() {
        return {
            fields: [
                {
                    id: 'webdavSaveMethod',
                    title: 'webdavSaveMethod',
                    type: 'select',
                    value: this.appSettings.webdavSaveMethod || 'default',
                    options: { default: 'webdavSaveMove', put: 'webdavSavePut' }
                },
                {
                    id: 'webdavStatReload',
                    title: 'webdavStatReload',
                    type: 'checkbox',
                    value: !!this.appSettings.webdavStatReload
                }
            ]
        };
    }

    applySetting(key, value) {
        this.appSettings[key] = value;
    }

    load(path, opts, callback) {
        this._request(
            {
                op: 'Load',
                method: 'GET',
                path,
                user: opts ? opts.user : null,
                password: opts ? opts.password : null,
                nostat: this.appSettings.webdavStatReload
            },
            callback
                ? (err, xhr, stat) => {
                      if (this.appSettings.webdavStatReload) {
                          this._calcStatByContent(xhr).then((stat) =>
                              callback(err, xhr.response, stat)
                          );
                      } else {
                          callback(err, xhr.response, stat);
                      }
                  }
                : null
        );
    }

    stat(path, opts, callback) {
        this._statRequest(
            path,
            opts,
            'Stat',
            callback ? (err, xhr, stat) => callback(err, stat) : null
        );
    }

    _statRequest(path, opts, op, callback) {
        if (this.appSettings.webdavStatReload) {
            this._request(
                {
                    op,
                    method: 'GET',
                    path,
                    user: opts ? opts.user : null,
                    password: opts ? opts.password : null,
                    nostat: true
                },
                callback
                    ? (err, xhr) => {
                          this._calcStatByContent(xhr).then((stat) => callback(err, xhr, stat));
                      }
                    : null
            );
        } else {
            this._request(
                {
                    op,
                    method: 'HEAD',
                    path,
                    user: opts ? opts.user : null,
                    password: opts ? opts.password : null
                },
                callback
                    ? (err, xhr, stat) => {
                          callback(err, xhr, stat);
                      }
                    : null
            );
        }
    }

    save(path, opts, data, callback, rev) {
        const cb = function (err, xhr, stat) {
            if (callback) {
                callback(err, stat);
                callback = null;
            }
        };
        const tmpPath = path.replace(/[^\/]+$/, (m) => '.' + m) + '.' + Date.now();
        const saveOpts = {
            path,
            user: opts ? opts.user : null,
            password: opts ? opts.password : null
        };
        this._statRequest(path, opts, 'Save:stat', (err, xhr, stat) => {
            let useTmpPath = this.appSettings.webdavSaveMethod !== 'put';
            if (err) {
                if (!err.notFound) {
                    return cb(err);
                } else {
                    this.logger.debug('Save: not found, creating');
                    useTmpPath = false;
                }
            } else if (stat.rev !== rev) {
                this.logger.debug('Save error', path, 'rev conflict', stat.rev, rev);
                return cb({ revConflict: true }, xhr, stat);
            }
            if (useTmpPath) {
                this._request(
                    {
                        ...saveOpts,
                        op: 'Save:put',
                        method: 'PUT',
                        path: tmpPath,
                        data,
                        nostat: true
                    },
                    (err) => {
                        if (err) {
                            return cb(err);
                        }
                        this._statRequest(path, opts, 'Save:stat', (err, xhr, stat) => {
                            if (err) {
                                this._request({
                                    ...saveOpts,
                                    op: 'Save:delete',
                                    method: 'DELETE',
                                    path: tmpPath
                                });
                                return cb(err, xhr, stat);
                            }
                            if (stat.rev !== rev) {
                                this.logger.debug(
                                    'Save error',
                                    path,
                                    'rev conflict',
                                    stat.rev,
                                    rev
                                );
                                this._request({
                                    ...saveOpts,
                                    op: 'Save:delete',
                                    method: 'DELETE',
                                    path: tmpPath
                                });
                                return cb({ revConflict: true }, xhr, stat);
                            }
                            let movePath = path;
                            if (movePath.indexOf('://') < 0) {
                                if (movePath.indexOf('/') === 0) {
                                    movePath = location.protocol + '//' + location.host + movePath;
                                } else {
                                    movePath = location.href
                                        .replace(/\?(.*)/, '')
                                        .replace(/[^/]*$/, movePath);
                                }
                            }
                            // prevent double encoding, see #1729
                            const encodedMovePath = /%[A-Z0-9]{2}/.test(movePath)
                                ? movePath
                                : encodeURI(movePath);
                            this._request(
                                {
                                    ...saveOpts,
                                    op: 'Save:move',
                                    method: 'MOVE',
                                    path: tmpPath,
                                    nostat: true,
                                    headers: {
                                        Destination: encodedMovePath,
                                        'Overwrite': 'T'
                                    }
                                },
                                (err) => {
                                    if (err) {
                                        return cb(err);
                                    }
                                    this._statRequest(path, opts, 'Save:stat', (err, xhr, stat) => {
                                        cb(err, xhr, stat);
                                    });
                                }
                            );
                        });
                    }
                );
            } else {
                this._request(
                    {
                        ...saveOpts,
                        op: 'Save:put',
                        method: 'PUT',
                        data,
                        nostat: true
                    },
                    (err) => {
                        if (err) {
                            return cb(err);
                        }
                        this._statRequest(path, opts, 'Save:stat', (err, xhr, stat) => {
                            cb(err, xhr, stat);
                        });
                    }
                );
            }
        });
    }

    fileOptsToStoreOpts(opts, file) {
        const result = { user: opts.user, encpass: opts.encpass };
        if (opts.password) {
            const fileId = file.uuid;
            const password = opts.password;
            const encpass = this._xorString(password, fileId);
            result.encpass = btoa(encpass);
        }
        return result;
    }

    storeOptsToFileOpts(opts, file) {
        const result = { user: opts.user, password: opts.password };
        if (opts.encpass) {
            const fileId = file.uuid;
            const encpass = atob(opts.encpass);
            result.password = this._xorString(encpass, fileId);
        }
        return result;
    }

    _xorString(str, another) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const strCharCode = str.charCodeAt(i);
            const anotherIx = i % another.length;
            const anotherCharCode = another.charCodeAt(anotherIx);
            const resultCharCode = strCharCode ^ anotherCharCode;
            result += String.fromCharCode(resultCharCode);
        }
        return result;
    }

    _request(config, callback) {
        if (config.rev) {
            this.logger.debug(config.op, config.path, config.rev);
        } else {
            this.logger.debug(config.op, config.path);
        }
        const ts = this.logger.ts();
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load', () => {
            if ([200, 201, 204].indexOf(xhr.status) < 0) {
                this.logger.debug(
                    config.op + ' error',
                    config.path,
                    xhr.status,
                    this.logger.ts(ts)
                );
                let err;
                switch (xhr.status) {
                    case 404:
                        err = { notFound: true };
                        break;
                    case 412:
                        err = { revConflict: true };
                        break;
                    default:
                        err = 'HTTP status ' + xhr.status;
                        break;
                }
                if (callback) {
                    callback(err, xhr);
                    callback = null;
                }
                return;
            }
            const rev = xhr.getResponseHeader('Last-Modified');
            if (!rev && !config.nostat) {
                this.logger.debug(
                    config.op + ' error',
                    config.path,
                    'no headers',
                    this.logger.ts(ts)
                );
                if (callback) {
                    callback(Locale.webdavNoLastModified, xhr);
                    callback = null;
                }
                return;
            }
            const completedOpName =
                config.op + (config.op.charAt(config.op.length - 1) === 'e' ? 'd' : 'ed');
            this.logger.debug(completedOpName, config.path, rev, this.logger.ts(ts));
            if (callback) {
                callback(null, xhr, rev ? { rev } : null);
                callback = null;
            }
        });
        xhr.addEventListener('error', () => {
            this.logger.debug(config.op + ' error', config.path, this.logger.ts(ts));
            if (callback) {
                callback('network error', xhr);
                callback = null;
            }
        });
        xhr.addEventListener('abort', () => {
            this.logger.debug(config.op + ' error', config.path, 'aborted', this.logger.ts(ts));
            if (callback) {
                callback('aborted', xhr);
                callback = null;
            }
        });
        xhr.open(config.method, config.path);
        xhr.responseType = 'arraybuffer';
        if (config.user) {
            xhr.setRequestHeader(
                'Authorization',
                'Basic ' + btoa(config.user + ':' + config.password)
            );
        }
        if (config.headers) {
            for (const [header, value] of Object.entries(config.headers)) {
                xhr.setRequestHeader(header, value);
            }
        }
        if (['GET', 'HEAD'].indexOf(config.method) >= 0) {
            xhr.setRequestHeader('Cache-Control', 'no-cache');
        }
        if (config.data) {
            const blob = new Blob([config.data], { type: 'application/octet-stream' });
            xhr.send(blob);
        } else {
            xhr.send();
        }
    }

    _calcStatByContent(xhr) {
        if (
            xhr.status !== 200 ||
            xhr.responseType !== 'arraybuffer' ||
            !xhr.response ||
            !xhr.response.byteLength
        ) {
            this.logger.debug('Cannot calculate rev by content');
            return null;
        }
        return kdbxweb.CryptoEngine.sha256(xhr.response).then((hash) => {
            const rev = kdbxweb.ByteUtils.bytesToHex(hash).slice(0, 10);
            this.logger.debug('Calculated rev by content', `${xhr.response.byteLength} bytes`, rev);
            return { rev };
        });
    }
}

export { StorageWebDav };
