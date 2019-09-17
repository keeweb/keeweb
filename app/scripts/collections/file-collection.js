import { Collection } from 'framework/collection';
import { FileModel } from 'models/file-model';

class FileCollection extends Collection {
    static model = FileModel;

    hasOpenFiles() {
        return this.some(file => file.active);
    }

    hasUnsavedFiles() {
        return this.some(file => file.modified);
    }

    hasDirtyFiles() {
        return this.some(file => file.dirty);
    }

    getByName(name) {
        return this.find(file => file.name.toLowerCase() === name.toLowerCase());
    }
}

export { FileCollection };
