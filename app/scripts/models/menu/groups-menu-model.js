import { GroupCollection } from 'collections/group-collection';
import { MenuSectionModel } from 'models/menu/menu-section-model';

const GroupsMenuModel = MenuSectionModel.extend({
    defaults: _.extend({}, MenuSectionModel.prototype.defaults, {
        scrollable: true,
        grow: true
    }),

    initialize() {
        this.set('items', new GroupCollection());
    },

    _loadItemCollectionType() {
        return require('collections/group-collection').GroupCollection;
    }
});

export { GroupsMenuModel };
