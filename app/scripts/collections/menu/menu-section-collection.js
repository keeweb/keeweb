'use strict';

var Backbone = require('backbone'),
    MenuSectionModel = require('../../models/menu/menu-section-model');

var MenuSectionCollection = Backbone.Collection.extend({
    model: MenuSectionModel
});

module.exports = MenuSectionCollection;
