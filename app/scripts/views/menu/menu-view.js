'use strict';

var Backbone = require('backbone'),
    Resizable = require('../../util/resizable'),
    MenuSectionView = require('./menu-section-view'),
    DragView = require('../drag-view');

var MenuView = Backbone.View.extend({
    template: require('templates/menu/menu.html'),

    events: {},

    sectionViews: [],

    minWidth: 110,
    maxWidth: 300,

    initialize: function () {
        this.listenTo(this.model, 'change:sections', this.menuChanged);
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
        return this;
    },

    menuChanged: function() {
        this.render();
    }
});

_.extend(MenuView.prototype, Resizable);

module.exports = MenuView;
