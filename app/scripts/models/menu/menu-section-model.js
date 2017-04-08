const Backbone = require('backbone');
const MenuItemCollection = require('../../collections/menu/menu-item-collection');

const MenuItemModel = Backbone.Model.extend({
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
        const items = this.get('items');
        items.find(item => {
            if (item.file === file || item.get('file') === file) {
                items.remove(item);
                return true;
            }
        });
        this.trigger('change-items');
    },

    replaceByFile: function(file, newItem) {
        const items = this.get('items');
        items.find((item, ix) => {
            if (item.file === file || item.get('file') === file) {
                items.remove(item);
                items.add(newItem, { at: ix });
                return true;
            }
        });
        this.trigger('change-items');
    },

    setItems: function(items) {
        this.get('items').reset(items);
        this.trigger('change-items');
    }
});

module.exports = MenuItemModel;
