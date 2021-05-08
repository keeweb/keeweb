import { Model } from 'framework/model';
import { OtpDeviceEntryCollection } from './otp-device-entry-collection';

class OtpDeviceModel extends Model {
    entries = new OtpDeviceEntryCollection();
    groups = [];
    entryMap = {};

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

    open(callback) {
        throw 'Not implemented';
    }

    cancelOpen() {
        throw 'Not implemented';
    }

    close(callback) {
        throw 'Not implemented';
    }

    getOtp(callback) {
        throw 'Not implemented';
    }
}

OtpDeviceModel.defineModelProperties({
    id: '',
    backend: 'otp-device',
    skipOpenList: true,
    readOnly: true,
    active: false,
    entries: undefined,
    groups: undefined,
    name: undefined,
    shortName: undefined,
    deviceClassName: undefined,
    entryMap: undefined
});

export { OtpDeviceModel };
