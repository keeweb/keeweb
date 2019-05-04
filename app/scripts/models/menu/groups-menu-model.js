import _ from 'underscore';
import MenuSectionModel from './menu-section-model';
import GroupCollection from '../../collections/group-collection';

const GroupsMenuModel = MenuSectionModel.extend({
    defaults: _.extend({}, MenuSectionModel.prototype.defaults, {
        scrollable: true,
        grow: true
    }),

    initialize: function() {
        this.set('items', new GroupCollection());
    },

    _loadItemCollectionType: function() {
        return require('../../collections/group-collection').default;
    }
});

export default GroupsMenuModel;
