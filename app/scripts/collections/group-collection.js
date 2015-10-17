'use strict';

var Backbone = require('backbone'),
    GroupModel = require('../models/group-model');

var GroupCollection = Backbone.Collection.extend({
    model: GroupModel,

    removeByAttr: function(attr, val) {
        var items = this.get('items');
        items.forEach(function(item) {
            if (item[attr] === val) {
                items.remove(item);
            }
        });
    }
});

module.exports = GroupCollection;
