'use strict';

var Backbone = require('backbone'),
    MenuOptionModel = require('../../models/menu/menu-option-model');

var MenuOptionCollection = Backbone.Collection.extend({
    model: MenuOptionModel
});

module.exports = MenuOptionCollection;
