import { Collection } from 'framework/collection';
import { Plugin } from 'plugins/plugin';

class PluginCollection extends Collection {
    static model = Plugin;
}

export { PluginCollection };
