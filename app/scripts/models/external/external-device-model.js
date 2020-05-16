import { Model } from 'framework/model';
import { ExternalEntryCollection } from 'collections/external-entry-collection';

class ExternalDeviceModel extends Model {
    entries = new ExternalEntryCollection();
    groups = [];
    entryMap = {};

    close() {}

    forEachEntry(filter, callback) {
        if (filter.trash || filter.group || filter.tag) {
            return;
        }
        for (const entry of this.entries) {
            if (entry.matches(filter)) {
                callback(entry);
            }
        }
    }

    entryId(title, user) {
        return `${title}:${user}`.toLowerCase();
    }

    getMatchingEntry(entry) {
        return this.entryMap[this.entryId(entry.title, entry.user)];
    }

    _buildEntryMap() {
        for (const entry of this.entries) {
            this.entryMap[entry.id.toLowerCase()] = entry;
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
    deviceClassName: undefined,
    entryMap: undefined
});

export { ExternalDeviceModel };
