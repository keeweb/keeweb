import { Model } from 'framework/model';
import { MenuOptionCollection } from 'collections/menu/menu-option-collection';
import { MenuOptionModel } from 'models/menu/menu-option-model';

class MenuItemModel extends Model {
    constructor(model) {
        super(model);
        if (model && model.file) {
            model.file.on('change:name', this.changeTitle.bind(this));
        }
    }

    addItem(item) {
        this.items.push(item);
    }

    addOption(option) {
        if (!this.options) {
            this.options = new MenuOptionCollection();
        }
        this.options.push(new MenuOptionModel(option));
    }

    toggleExpanded() {
        const items = this.items;
        let expanded = !this.expanded;
        if (!items || !items.length) {
            expanded = true;
        }
        this.expanded = expanded;
    }

    changeTitle(model, newTitle) {
        this.title = newTitle;
    }
}

MenuItemModel.defineModelProperties({
    id: '',
    title: '',
    locTitle: '',
    icon: '',
    customIcon: null,
    active: false,
    expanded: true,
    items: null,
    shortcut: null,
    options: null,
    cls: null,
    iconCls: null,
    disabled: false,
    visible: true,
    drag: false,
    drop: false,
    filterKey: null,
    filterValue: null,
    collapsible: false,
    defaultItem: false,
    page: null,
    editable: false,
    file: null,
    section: null
});

export { MenuItemModel };
