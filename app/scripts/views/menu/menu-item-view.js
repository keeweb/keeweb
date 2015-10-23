'use strict';

var Backbone = require('backbone'),
    KeyHandler = require('../../util/key-handler'),
    Keys = require('../../const/keys'),
    Alerts = require('../../util/alerts');

var MenuItemView = Backbone.View.extend({
    template: require('templates/menu/menu-item.html'),

    events: {
        'mouseover': 'mouseover',
        'mouseout': 'mouseout',
        'click .menu__item-option': 'selectOption',
        'click': 'selectItem',
        'dblclick': 'expandItem'
    },

    iconEl: null,
    itemViews: null,

    initialize: function () {
        this.itemViews = [];
        this.listenTo(this.model, 'change:active', this.changeActive);
        this.listenTo(this.model, 'change:expanded', this.changeExpanded);
        this.listenTo(this.model, 'change:cls', this.changeCls);
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
        if (items && this.model.get('expanded')) {
            items.forEach(function (item) {
                if (item.get('visible')) {
                    var itemView = new MenuItemView({el: this.$el, model: item});
                    itemView.listenTo(itemView, 'select', this.itemSelected);
                    itemView.render();
                    this.itemViews.push(itemView);
                }
            }, this);
        }
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

    changeActive: function(model, active) {
        this.$el.toggleClass('menu__item--active', active);
    },

    changeExpanded: function(model, expanded) {
        this.$el.toggleClass('menu__item--collapsed', !expanded);
    },

    changeCls: function(model, cls) {
        var oldCls = model.previousAttributes().cls;
        if (oldCls) {
            this.$el.removeClass(oldCls);
        }
        this.$el.addClass(cls);
    },

    mouseover: function(e) {
        this.$el.addClass('menu__item--hover');
        e.stopPropagation();
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
    }
});

module.exports = MenuItemView;
