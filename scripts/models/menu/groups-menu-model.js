import { GroupCollection } from 'collections/group-collection';
import { MenuSectionModel } from 'models/menu/menu-section-model';

class GroupsMenuModel extends MenuSectionModel {
    constructor() {
        super(new GroupCollection());
    }
}

GroupsMenuModel.defineModelProperties({
    scrollable: true,
    grow: true
});

export { GroupsMenuModel };
