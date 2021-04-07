import { Collection } from 'framework/collection';
import { Model } from 'framework/model';

class FileCollection extends Collection {
    static model = Model;

    hasOpenFiles() {
        return this.some((file) => file.active);
    }

    hasUnsavedFiles() {
        return this.some((file) => file.modified);
    }

    hasDirtyFiles() {
        return this.some((file) => file.dirty);
    }

    getByName(name) {
        return this.find((file) => file.name.toLowerCase() === name.toLowerCase());
    }

    firstActiveKdbxFile() {
        return this.find((file) => file.active && !file.backend);
    }
}

export { FileCollection };
