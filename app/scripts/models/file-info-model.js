import { Model } from 'framework/model';

class FileInfoModel extends Model {
    constructor(data) {
        data = { ...data };
        for (const [key, val] of Object.entries(data)) {
            if (/Date$/.test(key)) {
                data[key] = val ? new Date(val) : null;
            }
        }
        super(data);
    }
}

FileInfoModel.defineModelProperties({
    id: '',
    name: '',
    storage: null,
    path: null,
    modified: false,
    editState: null,
    rev: null,
    syncDate: null,
    openDate: null,
    keyFileName: null,
    keyFileHash: null,
    opts: null,
    backup: null,
    fingerprint: null
});

export { FileInfoModel };
