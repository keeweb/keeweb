const Backbone = require('backbone');
const MenuSectionModel = require('../../models/menu/menu-section-model');

const MenuSectionCollection = Backbone.Collection.extend({
    model: MenuSectionModel
});

module.exports = MenuSectionCollection;
