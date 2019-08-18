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

    initialize(items) {
        this.set('items', new MenuItemCollection(items || this.defaultItems));
    },

    addItem(item) {
        this.get('items').add(item);
        this.trigger('change-items');
    },

    removeAllItems() {
        this.get('items').reset(this.defaultItems);
        this.trigger('change-items');
    },

    removeByFile(file) {
        const items = this.get('items');
        items.find(item => {
            if (item.file === file || item.get('file') === file) {
                items.remove(item);
                return true;
            }
            return false;
        });
        this.trigger('change-items');
    },

    replaceByFile(file, newItem) {
        const items = this.get('items');
        items.find((item, ix) => {
            if (item.file === file || item.get('file') === file) {
                items.remove(item);
                items.add(newItem, { at: ix });
                return true;
            }
            return false;
        });
        this.trigger('change-items');
    },

    setItems(items) {
        this.get('items').reset(items);
        this.trigger('change-items');
    }
});

module.exports = MenuItemModel;
