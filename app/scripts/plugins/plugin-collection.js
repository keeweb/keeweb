import Backbone from 'backbone';
import { Plugin } from 'plugins/plugin';

const PluginCollection = Backbone.Collection.extend({
    model: Plugin
});

export { PluginCollection };
