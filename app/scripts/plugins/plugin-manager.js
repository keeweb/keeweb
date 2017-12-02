const Backbone = require('backbone');
const Plugin = require('./plugin');
const PluginCollection = require('./plugin-collection');
const PluginGallery = require('./plugin-gallery');
const SettingsStore = require('../comp/settings-store');
const RuntimeInfo = require('../comp/runtime-info');
const SignatureVerifier = require('../util/signature-verifier');
const Logger = require('../util/logger');

const PluginManager = Backbone.Model.extend({
    UpdateInterval: 1000 * 60 * 60 * 24 * 7,

    defaults: {
        plugins: new PluginCollection(),
        autoUpdateAppVersion: null,
        autoUpdateDate: null
    },

    logger: new Logger('plugin-mgr'),

    init() {
        const ts = this.logger.ts();
        return SettingsStore.load('plugins').then(state => {
            if (!state) {
                return;
            }
            this.set({
                autoUpdateAppVersion: state.autoUpdateAppVersion,
                autoUpdateDate: state.autoUpdateDate
            });
            if (!state || !state.plugins || !state.plugins.length) {
                return;
            }
            return PluginGallery.getCachedGallery().then(gallery => {
                const promises = state.plugins.map(plugin => this.loadPlugin(plugin, gallery));
                return Promise.all(promises).then(loadedPlugins => {
                    const plugins = this.get('plugins');
                    plugins.add(loadedPlugins.filter(plugin => plugin));
                    this.logger.info(`Loaded ${plugins.length} plugins`, this.logger.ts(ts));
                });
            });
        });
    },

    install(url, expectedManifest, skipSignatureValidation) {
        this.trigger('change');
        return Plugin.loadFromUrl(url, expectedManifest).then(plugin => {
            return this.uninstall(plugin.id).then(() => {
                if (skipSignatureValidation) {
                    plugin.set('skipSignatureValidation', true);
                }
                return plugin.install(true, false).then(() => {
                    this.get('plugins').push(plugin);
                    this.trigger('change');
                    this.saveState();
                });
            });
        }).catch(e => {
            this.trigger('change');
            throw e;
        });
    },

    installIfNew(url, expectedManifest, skipSignatureValidation) {
        const plugin = this.get('plugins').find({ url });
        if (plugin && plugin.get('status') !== 'invalid') {
            return Promise.resolve();
        }
        return this.install(url, expectedManifest, skipSignatureValidation);
    },

    uninstall(id) {
        const plugins = this.get('plugins');
        const plugin = plugins.get(id);
        if (!plugin) {
            return Promise.resolve();
        }
        this.trigger('change');
        return plugin.uninstall().then(() => {
            plugins.remove(id);
            this.trigger('change');
            this.saveState();
        });
    },

    disable(id) {
        const plugins = this.get('plugins');
        const plugin = plugins.get(id);
        if (!plugin || plugin.get('status') !== Plugin.STATUS_ACTIVE) {
            return Promise.resolve();
        }
        this.trigger('change');
        return plugin.disable().then(() => {
            this.trigger('change');
            this.saveState();
        });
    },

    activate(id) {
        const plugins = this.get('plugins');
        const plugin = plugins.get(id);
        if (!plugin || plugin.get('status') === Plugin.STATUS_ACTIVE) {
            return Promise.resolve();
        }
        this.trigger('change');
        return plugin.install(true, true).then(() => {
            this.trigger('change');
            this.saveState();
        });
    },

    update(id) {
        const plugins = this.get('plugins');
        const oldPlugin = plugins.get(id);
        const validStatuses = [Plugin.STATUS_ACTIVE, Plugin.STATUS_INACTIVE, Plugin.STATUS_NONE, Plugin.STATUS_ERROR, Plugin.STATUS_INVALID];
        if (!oldPlugin || validStatuses.indexOf(oldPlugin.get('status')) < 0) {
            return Promise.reject();
        }
        const url = oldPlugin.get('url');
        this.trigger('change');
        return Plugin.loadFromUrl(url).then(newPlugin => {
            return oldPlugin.update(newPlugin).then(() => {
                this.trigger('change');
                this.saveState();
            }).catch(e => {
                this.trigger('change');
                throw e;
            });
        }).catch(e => {
            this.trigger('change');
            throw e;
        });
    },

    setAutoUpdate(id, enabled) {
        const plugins = this.get('plugins');
        const plugin = plugins.get(id);
        if (!plugin || plugin.get('autoUpdate') === enabled) {
            return;
        }
        plugin.setAutoUpdate(enabled);
        this.trigger('change');
        this.saveState();
    },

    runAutoUpdate() {
        const queue = this.get('plugins').filter(p => p.get('autoUpdate')).map(p => p.id);
        if (!queue.length) {
            return Promise.resolve();
        }
        const anotherVersion = this.get('autoUpdateAppVersion') !== RuntimeInfo.version;
        const wasLongAgo = !this.get('autoUpdateDate') || Date.now() - this.get('autoUpdateDate') > this.UpdateInterval;
        const autoUpdateRequired = anotherVersion || wasLongAgo;
        if (!autoUpdateRequired) {
            return;
        }
        this.logger.info('Auto-updating plugins', queue.join(', '));
        this.set({
            autoUpdateAppVersion: RuntimeInfo.version,
            autoUpdateDate: Date.now()
        });
        this.saveState();
        const updateNext = () => {
            const pluginId = queue.shift();
            if (pluginId) {
                return this.update(pluginId).catch(() => {}).then(updateNext);
            }
        };
        return updateNext();
    },

    loadPlugin(desc, gallery) {
        const plugin = new Plugin({
            manifest: desc.manifest,
            url: desc.url,
            autoUpdate: desc.autoUpdate
        });
        let enabled = desc.enabled;
        if (enabled) {
            const galleryPlugin = gallery ? gallery.plugins.find(pl => pl.manifest.name === desc.manifest.name) : null;
            const expectedPublicKey = galleryPlugin ? galleryPlugin.manifest.publicKey : SignatureVerifier.getPublicKey();
            enabled = desc.manifest.publicKey === expectedPublicKey;
        }
        return plugin.install(enabled, true)
            .then(() => plugin)
            .catch(() => plugin);
    },

    saveState() {
        SettingsStore.save('plugins', {
            autoUpdateAppVersion: this.get('autoUpdateAppVersion'),
            autoUpdateDate: this.get('autoUpdateDate'),
            plugins: this.get('plugins').map(plugin => ({
                manifest: plugin.get('manifest'),
                url: plugin.get('url'),
                enabled: plugin.get('status') === 'active',
                autoUpdate: plugin.get('autoUpdate')
            }))
        });
    },

    getStatus(id) {
        const plugin = this.get('plugins').get(id);
        return plugin ? plugin.get('status') : '';
    },

    getPlugin(id) {
        return this.get('plugins').get(id);
    }
});

module.exports = new PluginManager();
