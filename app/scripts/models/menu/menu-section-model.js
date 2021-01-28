import { Model } from 'framework/model';
import { MenuItemCollection } from 'collections/menu/menu-item-collection';
import { MenuItemModel } from './menu-item-model';

function convertItem(item) {
    return item instanceof MenuItemModel ? item : new MenuItemModel(item);
}

class MenuSectionModel extends Model {
    constructor(items = []) {
        super({ items: new MenuItemCollection(items.map(convertItem)) });
    }

    addItem(item) {
        this.items.push(convertItem(item));
        this.emit('change-items');
    }

    removeAllItems() {
        this.items.length = 0;
        if (this.defaultItems) {
            this.items.push(...this.defaultItems.map((item) => new MenuItemModel(item)));
        }
        this.emit('change-items');
    }

    removeByFile(file) {
        const items = this.items;
        items.find((item) => {
            if (item.file === file) {
                items.remove(item);
                return true;
            }
            return false;
        });
        this.emit('change-items');
    }

    replaceByFile(file, newItem) {
        const items = this.items;
        items.find((item, ix) => {
            if (item.file === file) {
                items[ix] = newItem;
                return true;
            }
            return false;
        });
        this.emit('change-items');
    }

    setItems(items) {
        this.items.length = 0;
        this.items.push(...items.map(convertItem));
        this.emit('change-items');
    }
}

MenuSectionModel.defineModelProperties({
    defaultItems: null,
    items: null,
    scrollable: false,
    grow: false,
    drag: false,
    visible: undefined,
    active: false
});

export { MenuSectionModel };
