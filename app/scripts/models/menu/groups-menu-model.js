import { GroupCollection } from 'collections/group-collection';
import { MenuSectionModel } from 'models/menu/menu-section-model';

class GroupsMenuModel extends MenuSectionModel {
    constructor(cls = undefined) {
        super(new GroupCollection());
        this.cls = cls;
    }
}

GroupsMenuModel.defineModelProperties({
    scrollable: true,
    grow: true,
    cls: null
});

export { GroupsMenuModel };
