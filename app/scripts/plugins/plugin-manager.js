const Backbone = require('backbone');
const Plugin = require('./plugin');
const PluginCollection = require('./plugin-collection');
const SettingsStore = require('../comp/settings-store');
const Logger = require('../util/logger');

const PluginManager = Backbone.Model.extend({
    defaults: {
        state: '',
        installing: null,
        uninstalling: null,
        updating: null,
        lastInstall: null,
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

    install(url) {
        const lastInstall = { url, dt: new Date() };
        this.set({ installing: url, lastInstall: lastInstall });
        return Plugin.loadFromUrl(url).then(plugin => {
            return this.uninstall(plugin.id).then(() => {
                return plugin.install().then(() => {
                    this.get('plugins').push(plugin);
                    this.set({ installing: null });
                    this.saveState();
                });
            });
        }).catch(e => {
            this.set({ installing: null, lastInstall: _.extend(lastInstall, { error: e.toString() }) });
            throw e;
        });
    },

    uninstall(id) {
        const plugins = this.get('plugins');
        const plugin = plugins.get(id);
        if (!plugin) {
            return Promise.resolve();
        }
        this.set('uninstalling', id);
        return plugin.uninstall().then(() => {
            plugins.remove(id);
            this.set('uninstalling', null);
            this.saveState();
        });
    },

    update(id) {
        const plugins = this.get('plugins');
        const oldPlugin = plugins.get(id);
        if (!oldPlugin) {
            return Promise.reject();
        }
        const url = oldPlugin.get('url');
        this.set({ updating: id });
        return Plugin.loadFromUrl(url).then(newPlugin => {
            return oldPlugin.update(newPlugin).then(() => {
                this.set({ updating: null });
                this.saveState();
            }).catch(e => {
                this.set('updating', null);
                throw e;
            });
        }).catch(e => {
            this.set({ updating: null });
            throw e;
        });
    },

    loadPlugin(desc) {
        const plugin = new Plugin({
            manifest: desc.manifest,
            url: desc.url,
            local: true
        });
        return plugin.install()
            .then(() => plugin)
            .catch(() => plugin);
    },

    saveState() {
        SettingsStore.save('plugins', {
            plugins: this.get('plugins').map(plugin => ({
                manifest: plugin.get('manifest'),
                url: plugin.get('url')
            }))
        });
    }
});

module.exports = new PluginManager();
