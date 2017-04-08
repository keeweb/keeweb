const Backbone = require('backbone');
const Plugin = require('./plugin');

const PluginCollection = Backbone.Collection.extend({
    model: Plugin
});

module.exports = PluginCollection;
