import * as kdbxweb from 'kdbxweb';
import { StorageBase } from 'storage/storage-base';
// import { Locale } from 'util/locale';
import { createClient, AuthType } from 'webdav';

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

    _createClient(path, opts) {
        const pathUrl = new URL(path);

        return createClient(pathUrl.origin, {
            authType: AuthType.Digest,
            username: opts.user,
            password: opts.password
        });
    }

    load(path, opts, callback) {
        this.logger.debug('load', path);

        const client = this._createClient(path, opts);
        const pathUrl = new URL(path);

        client
            .getFileContents(pathUrl.pathname, { details: true })
            .then((result) => {
                this.logger.debug('load response', result);
                const stat = { rev: result.headers['last-modified'] };
                callback(null, result.data, stat);
            })
            .catch((err) => {
                this.logger.error('load error', err);
                callback(err);
            });
    }

    stat(path, opts, callback) {
        const client = this._createClient(path, opts);
        const pathUrl = new URL(path);

        this._stat(client, pathUrl.pathname)
            .then((stat) => callback(null, stat))
            .catch((err) => {
                this.logger.error('stat error', err);
                callback(err);
            });
    }

    _stat(client, path) {
        this.logger.debug('stat', path);

        return client.stat(path).then((result) => {
            this.logger.debug('stat response', result);
            return { rev: result.lastmod };
        });
    }

    save(path, opts, data, callback, rev) {
        this.logger.debug('save', path, rev);

        const client = this._createClient(path, opts);
        const pathUrl = new URL(path);

        const useTmpPath = this.appSettings.webdavSaveMethod !== 'put';
        if (useTmpPath) {
            const tmpPath = path.replace(/[^\/]+$/, (m) => '.' + m) + '.' + Date.now();
            const tmpUrl = new URL(tmpPath);

            client
                .putFileContents(tmpUrl.pathname, data)
                .then(() => {
                    return client.moveFile(tmpUrl.pathname, pathUrl.pathname).then(() => {
                        return this._stat(client, pathUrl.pathname).then((stat) =>
                            callback(null, stat)
                        );
                    });
                })
                .catch((err) => callback(err));
        } else {
            client
                .putFileContents(pathUrl.pathname, data)
                .then(() => {
                    return this._stat(client, pathUrl.pathname).then((stat) =>
                        callback(null, stat)
                    );
                })
                .catch((err) => callback(err));
        }
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
            const rev = kdbxweb.ByteUtils.bytesToHex(hash).substr(0, 10);
            this.logger.debug('Calculated rev by content', `${xhr.response.byteLength} bytes`, rev);
            return { rev };
        });
    }
}

export { StorageWebDav };
