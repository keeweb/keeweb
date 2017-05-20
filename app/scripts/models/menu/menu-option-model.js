const Backbone = require('backbone');

const MenuOptionModel = Backbone.Model.extend({
    defaults: {
        title: '',
        cls: '',
        value: '',
        active: false,
        filterValue: null
    }
});

module.exports = MenuOptionModel;
