import Backbone from 'backbone';
import { FileModel } from 'models/file-model';

const FileCollection = Backbone.Collection.extend({
    model: FileModel,

    hasOpenFiles() {
        return this.some(file => file.get('open'));
    },

    hasUnsavedFiles() {
        return this.some(file => file.get('modified'));
    },

    hasDirtyFiles() {
        return this.some(file => file.get('dirty'));
    },

    getByName(name) {
        return this.find(file => file.get('name').toLowerCase() === name.toLowerCase());
    }
});

export { FileCollection };
