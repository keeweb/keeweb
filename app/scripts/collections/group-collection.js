import { Collection } from 'framework/collection';
import { GroupModel } from 'models/group-model';

class GroupCollection extends Collection {
    static model = GroupModel;
}

export { GroupCollection };
