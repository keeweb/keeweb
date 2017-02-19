'use strict';

const Backbone = require('backbone');
const Plugin = require('./plugin');
const PluginCollection = require('./plugin-collection');

const PluginManager = Backbone.Model.extend({
    defaults: {
        state: '',
        installing: false,
        plugins: new PluginCollection()
    },

    install(url) {
        this.set('installing', true);
        return Plugin.load(url).then(plugin => {
            const plugins = this.get('plugins');
            return Promise.resolve().then(() => {
                if (plugins.get(plugin.id)) {
                    return plugins.get(plugin.id).uninstall().then(() => {
                        plugins.remove(plugin.id);
                    });
                }
            }).then(() => {
                plugins.push(plugin);
                return plugin.install().then(() => {
                    this.set('installing', false);
                }).catch(e => {
                    this.set('installing', false);
                    throw e;
                });
            });
        }).catch(e => {
            this.set('installing', false);
            throw e;
        });
    }
});

module.exports = new PluginManager();
