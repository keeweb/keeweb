import { Model } from 'framework/model';
import { ExternalEntryCollection } from 'collections/external-entry-collection';

class ExternalDeviceModel extends Model {
    entries = new ExternalEntryCollection();
    groups = [];

    close() {}

    forEachEntry(filter, callback) {
        if (filter.trash || filter.group) {
            return;
        }
        for (const entry of this.entries) {
            if (entry.matches(filter)) {
                callback(entry);
            }
        }
    }
}

ExternalDeviceModel.defineModelProperties({
    id: '',
    external: true,
    readOnly: true,
    active: false,
    entries: undefined,
    groups: undefined,
    name: undefined,
    shortName: undefined,
    deviceClassName: undefined
});

export { ExternalDeviceModel };
