import { Collection } from 'framework/collection';
import { EntryModel } from 'models/entry-model';

class EntryCollection extends Collection {
    static model = EntryModel;
}

export { EntryCollection };
