import { Model } from 'framework/model';
import { pick } from 'util/fn';

const DefaultProperties = {
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
    keyFilePath: null,
    opts: null,
    backup: null,
    fingerprint: null, // obsolete
    chalResp: null,
    encryptedPassword: null,
    encryptedPasswordDate: null
};

class FileInfoModel extends Model {
    constructor(data) {
        data = pick({ ...data }, Object.keys(DefaultProperties));
        for (const [key, val] of Object.entries(data)) {
            if (/Date$/.test(key)) {
                data[key] = val ? new Date(val) : null;
            }
        }
        super(data);
    }
}

FileInfoModel.defineModelProperties(DefaultProperties);

export { FileInfoModel };
