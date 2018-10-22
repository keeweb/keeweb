const Backbone = require('backbone');
const Keys = require('../../const/keys');
const KeyHandler = require('../../comp/key-handler');
const Resizable = require('../../mixins/resizable');
const MenuSectionView = require('./menu-section-view');
const DragView = require('../drag-view');
const AppSettingsModel = require('../../models/app-settings-model');

const MenuView = Backbone.View.extend({
    template: require('templates/menu/menu.hbs'),

    events: {},

    sectionViews: [],

    minWidth: 130,
    maxWidth: 300,

    initialize: function () {
        this.listenTo(this.model, 'change:sections', this.menuChanged);
        this.listenTo(this, 'view-resize', this.viewResized);
        KeyHandler.onKey(Keys.DOM_VK_UP, this.selectPreviousSection, this, KeyHandler.SHORTCUT_ACTION + KeyHandler.SHORTCUT_OPT);
        KeyHandler.onKey(Keys.DOM_VK_DOWN, this.selectNextSection, this, KeyHandler.SHORTCUT_ACTION + KeyHandler.SHORTCUT_OPT);
    },

    remove: function() {
        this.sectionViews.forEach(sectionView => sectionView.remove());
        this.sectionViews = [];
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    render: function () {
        this.$el.html(this.template());
        const sectionsEl = this.$el.find('.menu');
        this.model.get('sections').forEach(function(section) {
            const sectionView = new MenuSectionView({ el: sectionsEl, model: section });
            sectionView.render();
            if (section.get('drag')) {
                const dragView = new DragView('y');
                const dragEl = $('<div/>').addClass('menu__drag-section').appendTo(sectionsEl);
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

    viewResized: _.throttle(size => {
        AppSettingsModel.instance.set('menuViewWidth', size);
    }, 1000),

    switchVisibility: function(visible) {
        this.$el.toggleClass('menu-visible', visible);
    },

    selectPreviousSection: function() {
        Backbone.trigger('select-previous-menu-item');
    },

    selectNextSection: function() {
        Backbone.trigger('select-next-menu-item');
    }
});

_.extend(MenuView.prototype, Resizable);

module.exports = MenuView;
