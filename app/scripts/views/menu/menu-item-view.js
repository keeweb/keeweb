'use strict';

var Backbone = require('backbone'),
    KeyHandler = require('../../comp/key-handler'),
    Keys = require('../../const/keys'),
    Alerts = require('../../comp/alerts'),
    DragDropInfo = require('../../comp/drag-drop-info'),
    Locale = require('../../util/locale');

var MenuItemView = Backbone.View.extend({
    template: require('templates/menu/menu-item.hbs'),

    events: {
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
        'drop' : 'drop'
    },

    iconEl: null,
    itemViews: null,

    initialize: function () {
        this.itemViews = [];
        this.listenTo(this.model, 'change:title', this.changeTitle);
        this.listenTo(this.model, 'change:icon', this.changeIcon);
        this.listenTo(this.model, 'change:customIconId', this.render);
        this.listenTo(this.model, 'change:active', this.changeActive);
        this.listenTo(this.model, 'change:expanded', this.changeExpanded);
        this.listenTo(this.model, 'change:cls', this.changeCls);
        this.listenTo(this.model, 'delete', this.remove);
        this.listenTo(this.model, 'insert', this.insertItem);
        var shortcut = this.model.get('shortcut');
        if (shortcut) {
            KeyHandler.onKey(shortcut, this.selectItem, this, KeyHandler.SHORTCUT_OPT);
            if (shortcut !== Keys.DOM_VK_C) {
                KeyHandler.onKey(shortcut, this.selectItem, this, KeyHandler.SHORTCUT_ACTION);
            }
        }
    },

    render: function() {
        this.removeInnerViews();
        this.renderTemplate(this.model.attributes);
        this.iconEl = this.$el.find('i');
        var items = this.model.get('items');
        if (items) {
            items.forEach(function (item) {
                if (item.get('visible')) {
                    this.insertItem(item);
                }
            }, this);
        }
        this.$el.toggleClass('menu__item--collapsed', !this.model.get('expanded'));
        return this;
    },

    insertItem: function(item) {
        this.itemViews.push(new MenuItemView({el: this.$el, model: item}).render());
    },

    remove : function() {
        this.removeInnerViews();
        var shortcut = this.model.get('shortcut');
        if (shortcut) {
            KeyHandler.offKey(shortcut, this.selectItem, this, KeyHandler.SHORTCUT_OPT);
            if (shortcut !== Keys.DOM_VK_C) {
                KeyHandler.offKey(shortcut, this.selectItem, this, KeyHandler.SHORTCUT_ACTION);
            }
        }
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    removeInnerViews: function() {
        this.itemViews.forEach(function(itemView) { itemView.remove(); });
        this.itemViews = [];
    },

    changeTitle: function(model, title) {
        this.$el.find('.menu__item-title').first().text(title || '(no title)');
    },

    changeIcon: function(model, icon) {
        this.iconEl[0].className = 'menu__item-icon fa ' + (icon ? 'fa-' + icon : 'menu__item-icon--no-icon');
    },

    changeActive: function(model, active) {
        this.$el.toggleClass('menu__item--active', active);
    },

    changeExpanded: function(model, expanded) {
        this.$el.toggleClass('menu__item--collapsed', !expanded);
        this.model.setExpanded(expanded);
    },

    changeCls: function(model, cls) {
        var oldCls = model.previousAttributes().cls;
        if (oldCls) {
            this.$el.removeClass(oldCls);
        }
        this.$el.addClass(cls);
    },

    mouseover: function(e) {
        if (!e.button) {
            this.$el.addClass('menu__item--hover');
            e.stopPropagation();
        }
    },

    mouseout: function(e) {
        this.$el.removeClass('menu__item--hover');
        e.stopPropagation();
    },

    selectItem: function(e) {
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
    },

    selectOption: function(e) {
        var options = this.model.get('options');
        var value = $(e.target).data('value');
        if (options && options.length) {
            var option = options.find(function(op) { return op.get('value') === value; });
            if (option) {
                Backbone.trigger('menu-select', { item: this.model, option: option });
            }
        }
        e.stopImmediatePropagation();
        e.preventDefault();
    },

    expandItem: function(e) {
        if (this.model.toggleExpanded) {
            this.model.toggleExpanded();
        }
        e.stopPropagation();
    },

    editItem: function(e) {
        if (this.model.get('active') && this.model.get('editable')) {
            e.stopPropagation();
            Backbone.trigger('edit-group', this.model);
        }
    },

    emptyTrash: function(e) {
        e.stopPropagation();
        Alerts.yesno({
            header: Locale.menuEmptyTrashAlert,
            body: Locale.menuEmptyTrashAlertBody,
            icon: 'minus-circle',
            success: function() {
                Backbone.trigger('empty-trash');
            }
        });
    },

    dropAllowed: function(e) {
        return ['text/group', 'text/entry'].indexOf(e.originalEvent.dataTransfer.types[0]) >= 0;
    },

    dragstart: function(e) {
        e.stopPropagation();
        if (this.model.get('drag')) {
            e.originalEvent.dataTransfer.setData('text/group', this.model.id);
            e.originalEvent.dataTransfer.effectAllowed = 'move';
            DragDropInfo.dragObject = this.model;
        }
    },

    dragover: function(e) {
        e.stopPropagation();
        if (this.model.get('drop') && this.dropAllowed(e)) {
            e.preventDefault();
            this.$el.addClass('menu__item--drag');
        }
    },

    dragleave: function(e) {
        e.stopPropagation();
        if (this.model.get('drop') && this.dropAllowed(e)) {
            this.$el.removeClass('menu__item--drag');
        }
    },

    drop: function(e) {
        e.stopPropagation();
        if (this.model.get('drop') && this.dropAllowed(e)) {
            this.$el.removeClass('menu__item--drag');
            if (this.model.get('filterKey') === 'trash') {
                DragDropInfo.dragObject.moveToTrash();
                Backbone.trigger('refresh');
            } else {
                this.model.moveHere(DragDropInfo.dragObject);
            }
            Backbone.trigger('refresh');
        }
    }
});

module.exports = MenuItemView;
