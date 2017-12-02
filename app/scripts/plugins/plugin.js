const kdbxweb = require('kdbxweb');
const Backbone = require('backbone');
const PluginApi = require('./plugin-api');
const ThemeVars = require('./theme-vars');
const Logger = require('../util/logger');
const SettingsManager = require('../comp/settings-manager');
const IoCache = require('../storage/io-cache');
const AppSettingsModel = require('../models/app-settings-model');
const BaseLocale = require('../locales/base.json');
const SignatureVerifier = require('../util/signature-verifier');
const SemVer = require('../util/semver');
const RuntimeInfo = require('../comp/runtime-info');

const commonLogger = new Logger('plugin');
const io = new IoCache({
    cacheName: 'PluginFiles',
    logger: new Logger('storage-plugin-files')
});

const PluginStatus = {
    STATUS_NONE: '',
    STATUS_ACTIVE: 'active',
    STATUS_INACTIVE: 'inactive',
    STATUS_INSTALLING: 'installing',
    STATUS_ACTIVATING: 'activating',
    STATUS_UNINSTALLING: 'uninstalling',
    STATUS_UPDATING: 'updating',
    STATUS_INVALID: 'invalid',
    STATUS_ERROR: 'error'
};

const Plugin = Backbone.Model.extend(_.extend({}, PluginStatus, {
    idAttribute: 'name',

    defaults: {
        name: '',
        manifest: '',
        url: '',
        status: '',
        autoUpdate: false,
        installTime: null,
        installError: null,
        updateCheckDate: null,
        updateError: null,
        skipSignatureValidation: false
    },

    resources: {},
    module: null,

    initialize(options) {
        const name = options.manifest.name;
        this.set({ name });
        this.logger = new Logger(`plugin:${name}`);
    },

    install(activate, local) {
        const ts = this.logger.ts();
        this.set('status', this.STATUS_INSTALLING);
        return Promise.resolve().then(() => {
            const error = this.validateManifest();
            if (error) {
                this.logger.error('Manifest validation error', error);
                this.set('status', this.STATUS_INVALID);
                throw 'Plugin validation error: ' + error;
            }
            this.set('status', this.STATUS_INACTIVE);
            if (!activate) {
                this.logger.info('Loaded inactive plugin');
                return;
            }
            return this.installWithManifest(local)
                .then(() => this.set('installTime', this.logger.ts() - ts))
                .catch(err => {
                    this.logger.error('Error installing plugin', err);
                    this.set({
                        status: this.STATUS_ERROR,
                        installError: err,
                        installTime: this.logger.ts() - ts,
                        updateError: null
                    });
                    throw err;
                });
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
        if (!this.get('skipSignatureValidation') && manifest.publicKey !== SignatureVerifier.getPublicKey()) {
            return 'Public key mismatch';
        }
        if (!manifest.resources || !Object.keys(manifest.resources).length) {
            return 'No plugin resources';
        }
        if (manifest.resources.loc &&
            (!manifest.locale || !manifest.locale.title || !/^[a-z]{2}(-[A-Z]{2})?$/.test(manifest.locale.name))) {
            return 'Bad plugin locale';
        }
        if (manifest.desktop && !RuntimeInfo.launcher) {
            return 'Desktop plugin';
        }
        if (manifest.versionMin) {
            if (!/^\d+\.\d+\.\d+$/.test(manifest.versionMin)) {
                return 'Invalid versionMin';
            }
            if (SemVer.compareVersions(manifest.versionMin, RuntimeInfo.version) > 0) {
                return `Required min app version is ${manifest.versionMin}, actual ${RuntimeInfo.version}`;
            }
        }
        if (manifest.versionMax) {
            if (!/^\d+\.\d+\.\d+$/.test(manifest.versionMax)) {
                return 'Invalid versionMin';
            }
            if (SemVer.compareVersions(manifest.versionMax, RuntimeInfo.version) < 0) {
                return `Required max app version is ${manifest.versionMax}, actual ${RuntimeInfo.version}`;
            }
        }
    },

    validateUpdatedManifest(newManifest) {
        const manifest = this.get('manifest');
        if (manifest.name !== newManifest.name) {
            return 'Plugin name mismatch';
        }
        if (manifest.publicKey !== newManifest.publicKey) {
            return 'Public key mismatch';
        }
    },

    installWithManifest(local) {
        const manifest = this.get('manifest');
        this.logger.info('Loading plugin with resources', Object.keys(manifest.resources).join(', '), local ? '(local)' : '(url)');
        this.resources = {};
        const ts = this.logger.ts();
        const results = Object.keys(manifest.resources)
            .map(res => this.loadResource(res, local));
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

    getStorageResourcePath(res) {
        return this.id + '_' + this.getResourcePath(res);
    },

    loadResource(type, local) {
        const ts = this.logger.ts();
        let res;
        if (local) {
            res = new Promise((resolve, reject) => {
                const storageKey = this.getStorageResourcePath(type);
                io.load(storageKey, (err, data) => err ? reject(err) : resolve(data));
            });
        } else {
            const url = this.get('url');
            res = httpGet(url + this.getResourcePath(type), true);
        }
        return res.then(data => {
            this.logger.debug('Resource data loaded', type, this.logger.ts(ts));
            return this.verifyResource(data, type).then(data => {
                this.resources[type] = data;
            });
        });
    },

    verifyResource(data, type) {
        const ts = this.logger.ts();
        const manifest = this.get('manifest');
        const signature = manifest.resources[type];
        return SignatureVerifier.verify(data, signature, manifest.publicKey)
            .then(valid => {
                if (valid) {
                    this.logger.debug('Resource signature validated', type, this.logger.ts(ts));
                    return data;
                } else {
                    this.logger.error('Resource signature invalid', type);
                    throw `Signature invalid: ${type}`;
                }
            })
            .catch(() => {
                this.logger.error('Error validating resource signature', type);
                throw `Error validating resource signature for ${type}`;
            });
    },

    installWithResources() {
        this.logger.info('Installing plugin resources');
        const manifest = this.get('manifest');
        const promises = [];
        if (this.resources.css) {
            promises.push(this.applyCss(manifest.name, this.resources.css, manifest.theme));
        }
        if (this.resources.js) {
            promises.push(this.applyJs(manifest.name, this.resources.js));
        }
        if (this.resources.loc) {
            promises.push(this.applyLoc(manifest.locale, this.resources.loc));
        }
        return Promise.all(promises)
            .then(() => {
                this.set('status', this.STATUS_ACTIVE);
            })
            .catch(e => {
                this.logger.info('Install error', e);
                this.set('status', this.STATUS_ERROR);
                return this.disable().then(() => { throw e; });
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
            const storageKey = this.getStorageResourcePath(key);
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
            const storageKey = this.getStorageResourcePath(key);
            io.remove(storageKey, () => resolve());
        });
    },

    applyCss(name, data, theme) {
        return Promise.resolve().then(() => {
            const text = kdbxweb.ByteUtils.bytesToString(data);
            const id = 'plugin-css-' + name;
            this.createElementInHead('style', id, 'text/css', text);
            if (theme) {
                const locKey = this.getThemeLocaleKey(theme.name);
                SettingsManager.allThemes[theme.name] = locKey;
                BaseLocale[locKey] = theme.title;
                for (const styleSheet of document.styleSheets) {
                    if (styleSheet.ownerNode.id === id) {
                        this.processThemeStyleSheet(styleSheet, theme);
                        break;
                    }
                }
            }
            this.logger.debug('Plugin style installed');
        });
    },

    processThemeStyleSheet(styleSheet, theme) {
        const themeSelector = '.th-' + theme.name;
        const badSelectors = [];
        for (const rule of styleSheet.cssRules) {
            if (rule.selectorText && rule.selectorText.lastIndexOf(themeSelector, 0) !== 0) {
                badSelectors.push(rule.selectorText);
            }
            if (rule.selectorText === themeSelector) {
                this.addThemeVariables(rule);
            }
        }
        if (badSelectors.length) {
            this.logger.error('Themes must not add rules outside theme namespace. Bad selectors:', badSelectors);
            throw 'Invalid theme';
        }
    },

    addThemeVariables(rule) {
        ThemeVars.apply(rule.style);
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
                        this.loadPluginSettings();
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
            AppSettingsModel.instance.set('locale', 'en');
        }
    },

    getThemeLocaleKey(name) {
        return `setGenThemeCustom_${name}`;
    },

    removeTheme(theme) {
        delete SettingsManager.allThemes[theme.name];
        if (AppSettingsModel.instance.get('theme') === theme.name) {
            AppSettingsModel.instance.set('theme', 'fb');
        }
        delete BaseLocale[this.getThemeLocaleKey(theme.name)];
    },

    loadPluginSettings() {
        if (!this.module || !this.module.exports || !this.module.exports.setSettings) {
            return;
        }
        const ts = this.logger.ts();
        const settingPrefix = this.getSettingPrefix();
        let settings = null;
        for (const key of Object.keys(AppSettingsModel.instance.attributes)) {
            if (key.lastIndexOf(settingPrefix, 0) === 0) {
                if (!settings) {
                    settings = {};
                }
                settings[key.replace(settingPrefix, '')] = AppSettingsModel.instance.attributes[key];
            }
        }
        if (settings) {
            this.setSettings(settings);
        }
        this.logger.debug('Plugin settings loaded', this.logger.ts(ts));
    },

    uninstallPluginCode() {
        if (this.get('manifest').resources.js && this.module && this.module.exports && this.module.exports.uninstall) {
            try {
                this.module.exports.uninstall();
            } catch (e) {
                this.logger.error('Plugin uninstall method returned an error', e);
            }
        }
    },

    uninstall() {
        const ts = this.logger.ts();
        return this.disable().then(() => {
            return this.deleteResources().then(() => {
                this.set('status', '');
                this.logger.info('Uninstall complete', this.logger.ts(ts));
            });
        });
    },

    disable() {
        const manifest = this.get('manifest');
        this.logger.info('Disabling plugin with resources', Object.keys(manifest.resources).join(', '));
        this.set('status', this.STATUS_UNINSTALLING);
        const ts = this.logger.ts();
        return Promise.resolve().then(() => {
            if (manifest.resources.css) {
                this.removeElement('plugin-css-' + this.get('name'));
            }
            if (manifest.resources.js) {
                this.uninstallPluginCode();
                this.removeElement('plugin-js-' + this.get('name'));
            }
            if (manifest.resources.loc) {
                this.removeLoc(this.get('manifest').locale);
            }
            if (manifest.theme) {
                this.removeTheme(manifest.theme);
            }
            this.set('status', this.STATUS_INACTIVE);
            this.logger.info('Disable complete', this.logger.ts(ts));
        });
    },

    update(newPlugin) {
        const ts = this.logger.ts();
        const prevStatus = this.get('status');
        this.set('status', this.STATUS_UPDATING);
        return Promise.resolve().then(() => {
            const manifest = this.get('manifest');
            const newManifest = newPlugin.get('manifest');
            if (manifest.version === newManifest.version) {
                this.set({ status: prevStatus, updateCheckDate: Date.now(), updateError: null });
                this.logger.info(`v${manifest.version} is the latest plugin version`);
                return;
            }
            this.logger.info(`Updating plugin from v${manifest.version} to v${newManifest.version}`);
            const error = newPlugin.validateManifest() || this.validateUpdatedManifest(newManifest);
            if (error) {
                this.logger.error('Manifest validation error', error);
                this.set({ status: prevStatus, updateCheckDate: Date.now(), updateError: error });
                throw 'Plugin validation error: ' + error;
            }
            this.uninstallPluginCode();
            return newPlugin.installWithManifest(false)
                .then(() => {
                    this.module = newPlugin.module;
                    this.resources = newPlugin.resources;
                    this.set({
                        status: this.STATUS_ACTIVE,
                        manifest: newManifest,
                        installTime: this.logger.ts() - ts,
                        installError: null,
                        updateCheckDate: Date.now(),
                        updateError: null
                    });
                    this.logger.info('Update complete', this.logger.ts(ts));
                })
                .catch(err => {
                    this.logger.error('Error updating plugin', err);
                    if (prevStatus === this.STATUS_ACTIVE) {
                        this.logger.info('Activating previous version');
                        return this.installWithResources()
                            .then(() => {
                                this.set({ updateCheckDate: Date.now(), updateError: err });
                                throw err;
                            });
                    } else {
                        this.set({ status: prevStatus, updateCheckDate: Date.now(), updateError: err });
                        throw err;
                    }
                });
        });
    },

    setAutoUpdate(enabled) {
        this.set('autoUpdate', !!enabled);
    },

    getSettingPrefix() {
        return `plugin:${this.id}:`;
    },

    getSettings() {
        if (this.get('status') === PluginStatus.STATUS_ACTIVE && this.module && this.module.exports && this.module.exports.getSettings) {
            try {
                const settings = this.module.exports.getSettings();
                const settingsPrefix = this.getSettingPrefix();
                if (settings instanceof Array) {
                    return settings.map(setting => {
                        setting = _.clone(setting);
                        const value = AppSettingsModel.instance.get(settingsPrefix + setting.name);
                        if (value !== undefined) {
                            setting.value = value;
                        }
                        return setting;
                    });
                }
                this.logger.error('getSettings: expected Array, got ', typeof settings);
            } catch (e) {
                this.logger.error('getSettings error', e);
            }
        }
    },

    setSettings(settings) {
        for (const key of Object.keys(settings)) {
            const value = settings[key];
            AppSettingsModel.instance.set(this.getSettingPrefix() + key, value);
        }
        if (this.module.exports.setSettings) {
            try {
                this.module.exports.setSettings(settings);
            } catch (e) {
                this.logger.error('setSettings error', e);
            }
        }
    }
}));

_.extend(Plugin, PluginStatus);

Plugin.loadFromUrl = function(url, expectedManifest) {
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
            if (expectedManifest) {
                if (expectedManifest.name !== manifest.name) {
                    throw 'Bad plugin name';
                }
                if (expectedManifest.privateKey !== manifest.privateKey) {
                    throw 'Bad plugin private key';
                }
            }
            return new Plugin({
                manifest, url
            });
        });
};

function httpGet(url, binary) {
    url += '?ts=' + Date.now();
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
