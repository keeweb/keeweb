'use strict';

const Backbone = require('backbone');
const Plugin = require('./plugin');
const PluginCollection = require('./plugin-collection');

const PluginManager = Backbone.Model.extend({
    defaults: {
        state: '',
        installing: null,
        uninstalling: null,
        lastInstall: null,
        plugins: new PluginCollection()
    },

    install(url) {
        const lastInstall = { url, dt: new Date() };
        this.set({ installing: url, lastInstall: lastInstall });
        return Plugin.load(url).then(plugin =>
            this.uninstall(plugin.id).then(() => {
                const plugins = this.get('plugins');
                plugins.push(plugin);
                return plugin.install().then(() => {
                    this.set({ installing: null });
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
        });
    }
});

module.exports = new PluginManager();
