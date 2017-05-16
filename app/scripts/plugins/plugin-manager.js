const Backbone = require('backbone');
const Plugin = require('./plugin');
const PluginCollection = require('./plugin-collection');
const SettingsStore = require('../comp/settings-store');
const Logger = require('../util/logger');

const PluginManager = Backbone.Model.extend({
    defaults: {
        plugins: new PluginCollection()
    },

    logger: new Logger('plugin-mgr'),

    init() {
        const ts = this.logger.ts();
        return SettingsStore.load('plugins').then(state => {
            if (!state || !state.plugins || !state.plugins.length) {
                return;
            }
            const promises = state.plugins.map(plugin => this.loadPlugin(plugin));
            return Promise.all(promises).then(loadedPlugins => {
                const plugins = this.get('plugins');
                plugins.add(loadedPlugins.filter(plugin => plugin));
                this.logger.info(`Loaded ${plugins.length} plugins`, this.logger.ts(ts));
            });
        });
    },

    install(url, expectedManifest) {
        this.trigger('change');
        return Plugin.loadFromUrl(url, expectedManifest).then(plugin => {
            return this.uninstall(plugin.id).then(() => {
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

    installIfNew(url, expectedManifest) {
        const plugin = this.get('plugins').find({ url });
        return plugin ? Promise.resolve() : this.install(url, expectedManifest);
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

    loadPlugin(desc) {
        const plugin = new Plugin({
            manifest: desc.manifest,
            url: desc.url
        });
        return plugin.install(desc.enabled, true)
            .then(() => plugin)
            .catch(() => plugin);
    },

    saveState() {
        SettingsStore.save('plugins', {
            plugins: this.get('plugins').map(plugin => ({
                manifest: plugin.get('manifest'),
                url: plugin.get('url'),
                enabled: plugin.get('status') === 'active'
            }))
        });
    },

    getStatus(id) {
        const plugin = this.get('plugins').get(id);
        return plugin ? plugin.get('status') : '';
    }
});

module.exports = new PluginManager();
