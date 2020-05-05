import { Collection } from 'framework/collection';
import { ExternalEntryModel } from 'models/external/external-entry-model';

class ExternalEntryCollection extends Collection {
    static model = ExternalEntryModel;
}

export { ExternalEntryCollection };
