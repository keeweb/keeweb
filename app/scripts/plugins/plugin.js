'use strict';

const kdbxweb = require('kdbxweb');
const Backbone = require('backbone');
const PluginApi = require('./plugin-api');
const Logger = require('../util/logger');
const SettingsManager = require('../comp/settings-manager');
const IoCache = require('../storage/io-cache');

const commonLogger = new Logger('plugin');
const io = new IoCache({
    cacheName: 'PluginFiles',
    logger: new Logger('storage-plugin-files')
});

const Plugin = Backbone.Model.extend({
    idAttribute: 'name',

    defaults: {
        name: '',
        manifest: '',
        url: '',
        status: 'inactive',
        installTime: null
    },

    resources: null,

    initialize(manifest, url, local) {
        const name = manifest.name;
        this.set({
            name,
            manifest,
            url,
            local
        });
        this.logger = new Logger(`plugin:${name}`);
    },

    install() {
        const ts = this.logger.ts();
        this.set('status', 'installing');
        return Promise.resolve().then(() => {
            const error = this.validateManifest();
            if (error) {
                this.logger.error('Manifest validation error', error);
                this.set('status', 'invalid');
                throw 'Plugin validation error: ' + error;
            }
            return this.installWithManifest()
                .then(() => this.set('installTime', this.logger.ts() - ts));
        });
    },

    validateManifest() {
        const manifest = this.get('manifest');
        if (!manifest.name) {
            return 'No plugin name';
        }
        if (!manifest.description) {
            return 'No plugin description';
        }
        if (!/^\d+\.\d+\.\d+$/.test(manifest.version || '')) {
            return 'Invalid plugin version';
        }
        if (manifest.manifestVersion !== '0.1.0') {
            return 'Invalid manifest version ' + manifest.manifestVersion;
        }
        if (!manifest.author || !manifest.author.email || !manifest.author.name || !manifest.author.url) {
            return 'Invalid plugin author';
        }
        if (!manifest.url) {
            return 'No plugin url';
        }
        if (!manifest.publicKey) {
            return 'No plugin public key';
        }
        if (!manifest.resources || !Object.keys(manifest.resources).length) {
            return 'No plugin resources';
        }
        if (manifest.resources.loc &&
            (!manifest.locale || !manifest.locale.title || !/^[a-z]{2}(-[A-Z]{2})?$/.test(manifest.locale.name))) {
            return 'Bad plugin locale';
        }
    },

    installWithManifest() {
        const manifest = this.get('manifest');
        const local = this.get('local');
        this.logger.info('Loading plugin with resources', Object.keys(manifest.resources).join(', '), local ? '(local)' : '(url)');
        this.resources = {};
        const ts = this.logger.ts();
        const results = Object.keys(manifest.resources)
            .map(res => this.loadResource(res));
        return Promise.all(results)
            .catch(() => { throw 'Error loading plugin resources'; })
            .then(() => this.installWithResources())
            .then(() => local ? undefined : this.saveResources())
            .then(() => { this.logger.info('Install complete', this.logger.ts(ts)); });
    },

    getResourcePath(res) {
        switch (res) {
            case 'css':
                return 'plugin.css';
            case 'js':
                return 'plugin.js';
            case 'loc':
                return this.get('manifest').locale.name + '.json';
            default:
                throw `Unknown resource ${res}`;
        }
    },

    loadResource(type) {
        let res;
        if (this.get('local')) {
            res = this.loadLocalResource(type);
        } else {
            const url = this.get('url');
            res = this.loadResourceFromUrl(type, url + this.getResourcePath(type));
        }
        return res.then(data => {
            this.resources[type] = data;
        });
    },

    loadResourceFromUrl(type, url) {
        let ts = this.logger.ts();
        const manifest = this.get('manifest');
        return httpGet(url, true).then(data => {
            this.logger.debug('Resource data loaded', type, this.logger.ts(ts));
            ts = this.logger.ts();
            const key = kdbxweb.ByteUtils.arrayToBuffer(kdbxweb.ByteUtils.base64ToBytes(manifest.publicKey));
            const signature = kdbxweb.ByteUtils.arrayToBuffer(kdbxweb.ByteUtils.base64ToBytes(manifest.resources[type]));
            const algo = { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } };
            return kdbxweb.CryptoEngine.subtle.importKey('spki', key, algo, false, ['verify'])
                .then(subtleKey => kdbxweb.CryptoEngine.subtle.verify(algo, subtleKey, signature, data))
                .catch(e => {
                    this.logger.error('Error validating resource signature', type, e);
                    throw e;
                })
                .then(valid => {
                    if (valid) {
                        this.logger.debug('Resource signature valid', type, this.logger.ts(ts));
                        return data;
                    } else {
                        this.logger.error('Resource signature invalid', type);
                        throw `Signature invalid: ${type}`;
                    }
                });
        });
    },

    loadLocalResource(type) {
        return new Promise((resolve, reject) => {
            const storageKey = this.id + '/' + this.getResourcePath(type);
            io.load(storageKey, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    },

    installWithResources() {
        this.logger.info('Installing loaded plugin');
        const manifest = this.get('manifest');
        const promises = [];
        if (this.resources.css) {
            promises.push(this.applyCss(manifest.name, this.resources.css));
        }
        if (this.resources.js) {
            promises.push(this.applyJs(manifest.name, this.resources.js));
        }
        if (this.resources.loc) {
            promises.push(this.applyLoc(manifest.locale, this.resources.loc));
        }
        return Promise.all(promises)
            .then(() => {
                this.set('status', 'active');
            })
            .catch(e => {
                this.logger.info('Install error', e);
                return this.uninstall().then(() => { throw e; });
            });
    },

    saveResources() {
        const resourceSavePromises = [];
        for (const key of Object.keys(this.resources)) {
            resourceSavePromises.push(this.saveResource(key, this.resources[key]));
        }
        return Promise.all(resourceSavePromises)
            .catch(e => {
                this.logger.debug('Error saving plugin resources', e);
                return this.uninstall().then(() => { throw 'Error saving plugin resources'; });
            });
    },

    saveResource(key, value) {
        return new Promise((resolve, reject) => {
            const storageKey = this.id + '/' + this.getResourcePath(key);
            io.save(storageKey, value, e => {
                if (e) {
                    reject(e);
                } else {
                    resolve();
                }
            });
        });
    },

    deleteResources() {
        const resourceDeletePromises = [];
        for (const key of Object.keys(this.resources)) {
            resourceDeletePromises.push(this.deleteResource(key));
        }
        return Promise.all(resourceDeletePromises);
    },

    deleteResource(key) {
        return new Promise(resolve => {
            const storageKey = this.id + '/' + this.getResourcePath(key);
            io.remove(storageKey, () => resolve());
        });
    },

    applyCss(name, data) {
        return Promise.resolve().then(() => {
            const text = kdbxweb.ByteUtils.bytesToString(data);
            this.createElementInHead('style', 'plugin-css-' + name, 'text/css', text);
            this.logger.debug('Plugin style installed');
        });
    },

    applyJs(name, data) {
        return Promise.resolve().then(() => {
            let text = kdbxweb.ByteUtils.bytesToString(data);
            this.module = {exports: {}};
            const id = 'plugin-' + Date.now().toString() + Math.random().toString();
            global[id] = {
                require: PluginApi.require,
                module: this.module
            };
            text = `(function(require, module){${text}})(window["${id}"].require,window["${id}"].module);`;
            const ts = this.logger.ts();
            this.createElementInHead('script', 'plugin-js-' + name, 'text/javascript', text);
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    delete global[id];
                    if (this.module.exports.uninstall) {
                        this.logger.debug('Plugin script installed', this.logger.ts(ts));
                        resolve();
                    } else {
                        reject('Plugin script installation failed');
                    }
                }, 0);
            });
        });
    },

    createElementInHead(tagName, id, type, text) {
        let el = document.getElementById(id);
        if (el) {
            el.parentNode.removeChild(el);
        }
        el = document.createElement(tagName);
        el.appendChild(document.createTextNode(text));
        el.setAttribute('id', id);
        el.setAttribute('type', type);
        document.head.appendChild(el);
    },

    removeElement(id) {
        const el = document.getElementById(id);
        if (el) {
            el.parentNode.removeChild(el);
        }
    },

    applyLoc(locale, data) {
        return Promise.resolve().then(() => {
            const text = kdbxweb.ByteUtils.bytesToString(data);
            const localeData = JSON.parse(text);
            SettingsManager.allLocales[locale.name] = locale.title;
            SettingsManager.customLocales[locale.name] = localeData;
            this.logger.debug('Plugin locale installed');
        });
    },

    removeLoc(locale) {
        delete SettingsManager.allLocales[locale.name];
        delete SettingsManager.customLocales[locale.name];
        if (SettingsManager.activeLocale === locale.name) {
            SettingsManager.setLocale('en');
        }
    },

    uninstall() {
        const manifest = this.get('manifest');
        this.logger.info('Uninstalling plugin with resources', Object.keys(manifest.resources).join(', '));
        this.set('status', 'uninstalling');
        const ts = this.logger.ts();
        return Promise.resolve().then(() => {
            if (manifest.resources.css) {
                this.removeElement('plugin-css-' + this.get('name'));
            }
            if (manifest.resources.js) {
                try {
                    this.module.exports.uninstall();
                } catch (e) {
                    this.logger.error('Plugin uninstall method returned an error', e);
                }
                this.removeElement('plugin-js-' + this.get('name'));
            }
            if (manifest.resources.loc) {
                this.removeLoc(this.get('manifest').locale);
            }
            return this.deleteResources().then(() => {
                this.set('status', 'inactive');
                this.logger.info('Uninstall complete', this.logger.ts(ts));
            });
        });
    }
});

Plugin.loadFromUrl = function(url) {
    if (url[url.length - 1] !== '/') {
        url += '/';
    }
    commonLogger.info('Installing plugin from url', url);
    const manifestUrl = url + 'manifest.json';
    return httpGet(manifestUrl)
        .catch(e => {
            commonLogger.error('Error loading plugin manifest', e);
            throw 'Error loading plugin manifest';
        })
        .then(manifest => {
            try {
                manifest = JSON.parse(manifest);
            } catch (e) {
                commonLogger.error('Failed to parse manifest', manifest);
                throw 'Failed to parse manifest';
            }
            commonLogger.debug('Loaded manifest', manifest);
            return new Plugin(manifest, url);
        });
};

function httpGet(url, binary) {
    commonLogger.debug('GET', url);
    const ts = commonLogger.ts();
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                commonLogger.debug('GET OK', url, commonLogger.ts(ts));
                resolve(xhr.response);
            } else {
                commonLogger.debug('GET error', url, xhr.status);
                reject(xhr.status ? `HTTP status ${xhr.status}` : 'network error');
            }
        });
        xhr.addEventListener('error', () => {
            commonLogger.debug('GET error', url, xhr.status);
            reject(xhr.status ? `HTTP status ${xhr.status}` : 'network error');
        });
        xhr.addEventListener('abort', () => {
            commonLogger.debug('GET aborted', url);
            reject('Network request timeout');
        });
        xhr.addEventListener('timeout', () => {
            commonLogger.debug('GET timeout', url);
            reject('Network request timeout');
        });
        if (binary) {
            xhr.responseType = binary ? 'arraybuffer' : 'text';
        }
        xhr.open('GET', url);
        xhr.send();
    });
}

module.exports = Plugin;
