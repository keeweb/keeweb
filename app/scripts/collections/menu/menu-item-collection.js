const Backbone = require('backbone');
const MenuItemModel = require('../../models/menu/menu-item-model');

const MenuItemCollection = Backbone.Collection.extend({
    model: MenuItemModel
});

module.exports = MenuItemCollection;
