import Backbone from 'backbone';
import { View } from 'framework/views/view';
import { DragDropInfo } from 'comp/app/drag-drop-info';
import { KeyHandler } from 'comp/browser/key-handler';
import { Alerts } from 'comp/ui/alerts';
import { Keys } from 'const/keys';
import { Locale } from 'util/locale';
import template from 'templates/menu/menu-item.hbs';

class MenuItemView extends View {
    template = template;

    events = {
        'mouseover': 'mouseover',
        'mouseout': 'mouseout',
        'click .menu__item-option': 'selectOption',
        'click': 'selectItem',
        'dblclick': 'expandItem',
        'click .menu__item-edit': 'editItem',
        'click .menu__item-empty-trash': 'emptyTrash',
        'dragstart': 'dragstart',
        'dragover': 'dragover',
        'dragleave': 'dragleave',
        'drop': 'drop',
        'dragover .menu__item-drag-top': 'dragoverTop',
        'dragleave .menu__item-drag-top': 'dragleaveTop'
    };

    iconEl = null;
    itemViews = [];

    constructor(model, options) {
        super(model, options);
        this.listenTo(this.model, 'change:title', this.changeTitle);
        this.listenTo(this.model, 'change:icon', this.changeIcon);
        this.listenTo(this.model, 'change:customIconId', this.render);
        this.listenTo(this.model, 'change:active', this.changeActive);
        this.listenTo(this.model, 'change:expanded', this.changeExpanded);
        this.listenTo(this.model, 'change:cls', this.changeCls);
        this.listenTo(this.model, 'delete', this.remove);
        this.listenTo(this.model, 'insert', this.insertItem);
        const shortcut = this.model.get('shortcut');
        if (shortcut) {
            this.onKey(shortcut, this.selectItem, KeyHandler.SHORTCUT_OPT);
            if (shortcut !== Keys.DOM_VK_C) {
                this.onKey(shortcut, this.selectItem, KeyHandler.SHORTCUT_ACTION);
            }
        }
        this.once('remove', () => {
            this.removeInnerViews();
        });
    }

    render() {
        this.removeInnerViews();
        super.render(this.model.attributes);
        this.iconEl = this.$el.find('.menu__item-icon');
        const items = this.model.get('items');
        if (items) {
            items.forEach(item => {
                if (item.get('visible')) {
                    this.insertItem(item);
                }
            });
        }
        this.$el.toggleClass('menu__item--collapsed', !this.model.get('expanded'));
    }

    insertItem(item) {
        const itemView = new MenuItemView(item, { parent: this.el });
        itemView.render();
        this.itemViews.push(itemView);
    }

    removeInnerViews() {
        this.itemViews.forEach(itemView => itemView.remove());
        this.itemViews = [];
    }

    changeTitle(model, title) {
        this.$el
            .find('.menu__item-title')
            .first()
            .text(title || '(no title)');
    }

    changeIcon(model, icon) {
        this.iconEl[0].className =
            'menu__item-icon fa ' + (icon ? 'fa-' + icon : 'menu__item-icon--no-icon');
    }

    changeActive(model, active) {
        this.$el.toggleClass('menu__item--active', active);
    }

    changeExpanded(model, expanded) {
        this.$el.toggleClass('menu__item--collapsed', !expanded);
        this.model.setExpanded(expanded);
    }

    changeCls(model, cls) {
        const oldCls = model.previousAttributes().cls;
        if (oldCls) {
            this.$el.removeClass(oldCls);
        }
        this.$el.addClass(cls);
    }

    mouseover(e) {
        if (!e.button) {
            this.$el.addClass('menu__item--hover');
            e.stopPropagation();
        }
    }

    mouseout(e) {
        this.$el.removeClass('menu__item--hover');
        e.stopPropagation();
    }

    selectItem(e) {
        e.stopPropagation();
        e.preventDefault();
        if (this.model.get('active')) {
            return;
        }
        if (this.model.get('disabled')) {
            Alerts.info(this.model.get('disabled'));
        } else {
            Backbone.trigger('menu-select', { item: this.model });
        }
    }

    selectOption(e) {
        const options = this.model.get('options');
        const value = $(e.target).data('value');
        if (options && options.length) {
            const option = options.find(op => op.get('value') === value);
            if (option) {
                Backbone.trigger('menu-select', { item: this.model, option });
            }
        }
        e.stopImmediatePropagation();
        e.preventDefault();
    }

    expandItem(e) {
        if (this.model.toggleExpanded) {
            this.model.toggleExpanded();
        }
        e.stopPropagation();
    }

    editItem(e) {
        if (this.model.get('active') && this.model.get('editable')) {
            e.stopPropagation();
            switch (this.model.get('filterKey')) {
                case 'tag':
                    Backbone.trigger('edit-tag', this.model);
                    break;
                case 'group':
                    Backbone.trigger('edit-group', this.model);
                    break;
            }
        }
    }

    emptyTrash(e) {
        e.stopPropagation();
        Alerts.yesno({
            header: Locale.menuEmptyTrashAlert,
            body: Locale.menuEmptyTrashAlertBody,
            icon: 'minus-circle',
            success() {
                Backbone.trigger('empty-trash');
            }
        });
    }

    dropAllowed(e) {
        const types = e.dataTransfer.types;
        for (let i = 0; i < types.length; i++) {
            if (types[i] === 'text/group' || types[i] === 'text/entry') {
                return true;
            }
        }
        return false;
    }

    dragstart(e) {
        e.stopPropagation();
        if (this.model.get('drag')) {
            e.dataTransfer.setData('text/group', this.model.id);
            e.dataTransfer.effectAllowed = 'move';
            DragDropInfo.dragObject = this.model;
        }
    }

    dragover(e) {
        if (this.model.get('drop') && this.dropAllowed(e)) {
            e.stopPropagation();
            e.preventDefault();
            this.$el.addClass('menu__item--drag');
        }
    }

    dragleave(e) {
        e.stopPropagation();
        if (this.model.get('drop') && this.dropAllowed(e)) {
            this.$el.removeClass('menu__item--drag menu__item--drag-top');
        }
    }

    drop(e) {
        e.stopPropagation();
        if (this.model.get('drop') && this.dropAllowed(e)) {
            const isTop = this.$el.hasClass('menu__item--drag-top');
            this.$el.removeClass('menu__item--drag menu__item--drag-top');
            if (isTop) {
                this.model.moveToTop(DragDropInfo.dragObject);
            } else {
                if (this.model.get('filterKey') === 'trash') {
                    DragDropInfo.dragObject.moveToTrash();
                } else {
                    this.model.moveHere(DragDropInfo.dragObject);
                }
            }
            Backbone.trigger('refresh');
        }
    }

    dropTopAllowed(e) {
        const types = e.dataTransfer.types;
        for (let i = 0; i < types.length; i++) {
            if (types[i] === 'text/group') {
                return true;
            }
        }
        return false;
    }

    dragoverTop(e) {
        if (this.dropTopAllowed(e)) {
            this.$el.addClass('menu__item--drag-top');
        }
    }

    dragleaveTop(e) {
        if (this.dropTopAllowed(e)) {
            this.$el.removeClass('menu__item--drag-top');
        }
    }
}

export { MenuItemView };
