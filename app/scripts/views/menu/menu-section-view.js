'use strict';

var Backbone = require('backbone'),
    MenuItemView = require('./menu-item-view'),
    Resizable = require('../../mixins/resizable'),
    Scrollable = require('../../mixins/scrollable'),
    AppSettingsModel = require('../../models/app-settings-model');

var MenuSectionView = Backbone.View.extend({
    template: require('templates/menu/menu-section.hbs'),

    events: {},

    itemViews: null,

    minHeight: 55,
    maxHeight: function() { return this.$el.parent().height() - 116; },
    autoHeight: 'auto',

    initialize: function () {
        this.itemViews = [];
        this.listenTo(this.model, 'change-items', this.itemsChanged);
        this.listenTo(this, 'view-resize', this.viewResized);
    },

    render: function() {
        if (!this.itemsEl) {
            this.renderTemplate(this.model.attributes);
            this.itemsEl = this.model.get('scrollable') ? this.$el.find('.scroller') : this.$el;
            if (this.model.get('scrollable')) {
                this.initScroll();
                this.createScroll({
                    root: this.$el[0],
                    scroller: this.$el.find('.scroller')[0],
                    bar: this.$el.find('.scroller__bar')[0]
                });
            }
        } else {
            this.removeInnerViews();
        }
        this.model.get('items').forEach(function(item) {
            var itemView = new MenuItemView({ el: this.itemsEl, model: item });
            itemView.render();
            this.itemViews.push(itemView);
        }, this);
        if (this.model.get('drag')) {
            var height = AppSettingsModel.instance.get('tagsViewHeight');
            if (typeof height === 'number') {
                this.$el.height();
                this.$el.css('flex', '0 0 ' + height + 'px');
            }
        }
        this.pageResized();
    },

    remove : function() {
        if (this.scroll) {
            this.scroll.dispose();
        }
        this.removeInnerViews();
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    removeInnerViews: function() {
        this.itemViews.forEach(function(itemView) { itemView.remove(); });
        this.itemViews = [];
    },

    itemsChanged: function() {
        this.render();
    },

    viewResized: function(size) {
        this.$el.css('flex', '0 0 ' + (size ? size + 'px' : 'auto'));
        this.saveViewHeight(size);
    },

    saveViewHeight: _.throttle(function(size) {
        AppSettingsModel.instance.set('tagsViewHeight', size);
    }, 1000)
});

_.extend(MenuSectionView.prototype, Resizable);
_.extend(MenuSectionView.prototype, Scrollable);

module.exports = MenuSectionView;
