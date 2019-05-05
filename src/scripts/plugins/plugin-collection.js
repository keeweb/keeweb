import Backbone from 'backbone';
import Plugin from './plugin';

const PluginCollection = Backbone.Collection.extend({
    model: Plugin
});

export default PluginCollection;
