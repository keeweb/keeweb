'use strict';

var Backbone = require('backbone'),
    MenuItemCollection = require('../../collections/menu/menu-item-collection');

var MenuItemModel = Backbone.Model.extend({
    defaults: {
        items: null,
        scrollable: false,
        grow: false,
        drag: false
    },

    defaultItems: undefined,

    initialize: function(items) {
        this.set('items', new MenuItemCollection(items || this.defaultItems));
    },

    addItem: function(item) {
        this.get('items').add(item);
        this.trigger('change-items');
    },

    removeAllItems: function() {
        this.get('items').reset(this.defaultItems);
        this.trigger('change-items');
    },

    removeByFile: function(file) {
        this.get('items').removeByAttr('file', file);
        this.trigger('change-items');
    },

    setItems: function(items) {
        this.get('items').reset(items);
        this.trigger('change-items');
    }
});

module.exports = MenuItemModel;
