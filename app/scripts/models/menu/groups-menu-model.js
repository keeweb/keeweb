const MenuSectionModel = require('./menu-section-model');
const GroupCollection = require('../../collections/group-collection');

const GroupsMenuModel = MenuSectionModel.extend({
    defaults: _.extend({}, MenuSectionModel.prototype.defaults, {
        scrollable: true,
        grow: true
    }),

    initialize: function() {
        this.set('items', new GroupCollection());
    },

    _loadItemCollectionType: function() {
        return require('../../collections/group-collection');
    }
});

module.exports = GroupsMenuModel;
