'use strict';

var Backbone = require('backbone'),
    Resizable = require('../../mixins/resizable'),
    MenuSectionView = require('./menu-section-view'),
    DragView = require('../drag-view'),
    AppSettingsModel = require('../../models/app-settings-model');

var MenuView = Backbone.View.extend({
    template: require('templates/menu/menu.hbs'),

    events: {},

    sectionViews: [],

    minWidth: 110,
    maxWidth: 300,

    initialize: function () {
        this.listenTo(this.model, 'change:sections', this.menuChanged);
        this.listenTo(this, 'view-resize', this.viewResized);
    },

    remove: function() {
        this.sectionViews.forEach(function(sectionView) { sectionView.remove(); });
        this.sectionViews = [];
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    render: function () {
        this.$el.html(this.template());
        var sectionsEl = this.$el.find('.menu');
        this.model.get('sections').forEach(function(section) {
            var sectionView = new MenuSectionView({ el: sectionsEl, model: section });
            sectionView.render();
            if (section.get('drag')) {
                var dragView = new DragView('y');
                var dragEl = $('<div/>').addClass('menu__drag-section').appendTo(sectionsEl);
                sectionView.listenDrag(dragView);
                dragView.setElement(dragEl).render();
                this.sectionViews.push(dragView);
            }
            this.sectionViews.push(sectionView);
        }, this);
        if (typeof AppSettingsModel.instance.get('menuViewWidth') === 'number') {
            this.$el.width(AppSettingsModel.instance.get('menuViewWidth'));
        }
        return this;
    },

    menuChanged: function() {
        this.render();
    },

    viewResized: _.throttle(function(size) {
        AppSettingsModel.instance.set('menuViewWidth', size);
    }, 1000),

    switchVisibility: function(visible) {
        this.$el.toggleClass('menu-visible', visible);
    }
});

_.extend(MenuView.prototype, Resizable);

module.exports = MenuView;
