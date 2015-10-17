'use strict';

var Backbone = require('backbone');

var MenuOptionModel = Backbone.Model.extend({
    defaults: {
        title: '',
        cls: '',
        value: '',
        active: false,
        filterValue: null
    }
});

module.exports = MenuOptionModel;
