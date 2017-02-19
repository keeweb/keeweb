'use strict';

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
        lastInstall: null,
        plugins: new PluginCollection()
    },

    logger: new Logger('plugin-mgr'),

    init() {
        const ts = this.logger.ts();
        return Promise.resolve().then(() => {
            const state = this.loadState();
            if (!state || !state.plugins) {
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
        return Plugin.loadFromUrl(url).then(plugin =>
            this.uninstall(plugin.id).then(() => {
                return plugin.install().then(() => {
                    this.get('plugins').push(plugin);
                    this.set({ installing: null });
                    this.saveState();
                });
            })
        ).catch(e => {
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

    loadPlugin(desc) {
        const plugin = new Plugin(desc.manifest, desc.url, true);
        return plugin.install()
            .then(() => plugin)
            .catch(() => undefined);
    },

    saveState() {
        SettingsStore.save('plugins', {
            plugins: this.get('plugins').map(plugin => ({
                manifest: plugin.get('manifest'),
                url: plugin.get('url')
            }))
        });
    },

    loadState() {
        return SettingsStore.load('plugins');
    }
});

module.exports = new PluginManager();
