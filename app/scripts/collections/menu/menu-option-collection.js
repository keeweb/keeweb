const Backbone = require('backbone');
const MenuOptionModel = require('../../models/menu/menu-option-model');

const MenuOptionCollection = Backbone.Collection.extend({
    model: MenuOptionModel
});

module.exports = MenuOptionCollection;
