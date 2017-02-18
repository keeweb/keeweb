'use strict';

// const Logger = require('../util/logger');
const Plugin = require('./plugin');

// const logger = new Logger('plugin-manager');

const PluginManager = {
    plugins: {},

    install(url) {
        return Plugin.load(url).then(plugin => {
            const name = plugin.get('name');
            return Promise.resolve().then(() => {
                if (this.plugins[name]) {
                    return this.plugins[name].uninstall().then(() => {
                        delete this.plugins[name];
                    });
                }
            }).then(() => {
                this.plugins[name] = plugin;
                return plugin.install();
            });
        });
    }
};

module.exports = PluginManager;
