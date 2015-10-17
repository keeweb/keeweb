'use strict';

var Backbone = require('backbone'),
    MenuItemModel = require('../../models/menu/menu-item-model');

var MenuItemCollection = Backbone.Collection.extend({
    model: MenuItemModel
});

module.exports = MenuItemCollection;
