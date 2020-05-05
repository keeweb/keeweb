import { Model } from 'framework/model';
import { ExternalEntryCollection } from 'collections/external-entry-collection';

class ExternalDeviceModel extends Model {
    entries = new ExternalEntryCollection();
    groups = [];

    get external() {
        return true;
    }

    close() {}

    forEachEntry(filter, callback) {
        for (const entry of this.entries) {
            if (entry.matches(filter)) {
                callback(entry);
            }
        }
    }
}

ExternalDeviceModel.defineModelProperties({
    id: '',
    active: false,
    entries: undefined,
    groups: undefined,
    name: undefined,
    shortName: undefined
});

export { ExternalDeviceModel };
