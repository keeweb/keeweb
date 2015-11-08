'use strict';

var Backbone = require('backbone'),
    Resizable = require('../mixins/resizable'),
    Scrollable = require('../mixins/scrollable'),
    ListSearchView = require('./list-search-view'),
    EntryPresenter = require('../presenters/entry-presenter'),
    DragDropInfo = require('../comp/drag-drop-info'),
    baron = require('baron');

var ListView = Backbone.View.extend({
    template: require('templates/list.html'),
    itemTemplate: require('templates/list-item-short.html'),
    emptyTemplate: require('templates/list-empty.html'),

    events: {
        'click .list__item': 'itemClick',
        'dragstart .list__item': 'itemDragStart'
    },

    views: null,

    minWidth: 200,
    maxWidth: 500,

    itemsEl: null,

    initialize: function () {
        this.initScroll();
        this.views = {};
        this.views.search = new ListSearchView({ model: this.model });

        this.listenTo(this.views.search, 'select-prev', this.selectPrev);
        this.listenTo(this.views.search, 'select-next', this.selectNext);
        this.listenTo(this.views.search, 'create-entry', this.createEntry);
        this.listenTo(this.views.search, 'create-group', this.createGroup);
        this.listenTo(this, 'show', this.viewShown);
        this.listenTo(this, 'hide', this.viewHidden);
        this.listenTo(Backbone, 'filter', this.filterChanged);
        this.listenTo(Backbone, 'entry-updated', this.entryUpdated);

        this.items = [];
    },

    render: function () {
        if (!this.itemsEl) {
            this.$el.html(this.template());
            this.itemsEl = this.$el.find('.list__items>.scroller');
            this.views.search.setElement(this.$el.find('.list__header')).render();

            this.scroll = baron({
                root: this.$el.find('.list__items')[0],
                scroller: this.$el.find('.scroller')[0],
                bar: this.$el.find('.scroller__bar')[0],
                $: Backbone.$
            });
            this.scrollerBar = this.$el.find('.scroller__bar');
            this.scrollerBarWrapper = this.$el.find('.scroller__bar-wrapper');
        }
        if (this.items.length) {
            var presenter = new EntryPresenter(this.getDescField());
            var itemsHtml = '';
            this.items.forEach(function (item) {
                presenter.present(item);
                itemsHtml += this.itemTemplate(presenter);
            }, this);
            this.itemsEl.html(itemsHtml).scrollTop(0);
        } else {
            this.itemsEl.html(this.emptyTemplate());
        }
        this.pageResized();
        return this;
    },

    getDescField: function() {
        return this.model.sort.replace('-', '');
    },

    itemClick: function(e) {
        var id = $(e.target).closest('.list__item').attr('id');
        var item = this.items.get(id);
        if (!item.active) {
            this.selectItem(item);
        }
        Backbone.trigger('toggle-details', true);
    },

    selectPrev: function() {
        var activeItem = this.items.getActive(),
            ix = this.items.indexOf(activeItem);
        if (ix > 0) {
            this.selectItem(this.items.at(ix - 1));
        }
    },

    selectNext: function() {
        var activeItem = this.items.getActive(),
            ix = this.items.indexOf(activeItem);
        if (ix < this.items.length - 1) {
            this.selectItem(this.items.at(ix + 1));
        }
    },

    createEntry: function() {
        var newEntry = this.model.createNewEntry();
        this.items.unshift(newEntry);
        this.render();
        this.selectItem(newEntry);
    },

    createGroup: function() {
        var newGroup = this.model.createNewGroup();
        Backbone.trigger('edit-group', newGroup);
    },

    selectItem: function(item) {
        this.items.setActive(item);
        Backbone.trigger('select-entry', item);
        this.itemsEl.find('.list__item--active').removeClass('list__item--active');
        var itemEl = document.getElementById(item.get('id'));
        itemEl.classList.add('list__item--active');
        var listEl = this.itemsEl[0],
            itemRect = itemEl.getBoundingClientRect(),
            listRect = listEl.getBoundingClientRect();
        if (itemRect.top < listRect.top) {
            listEl.scrollTop += itemRect.top - listRect.top;
        } else if (itemRect.bottom > listRect.bottom) {
            listEl.scrollTop += itemRect.bottom - listRect.bottom;
        }
    },

    viewShown: function() {
        this.views.search.show();
    },

    viewHidden: function() {
        this.views.search.hide();
    },

    filterChanged: function(filter) {
        this.items = filter.entries;
        this.render();
    },

    entryUpdated: function() {
        var scrollTop = this.itemsEl[0].scrollTop;
        this.render();
        this.itemsEl[0].scrollTop = scrollTop;
    },

    itemDragStart: function(e) {
        e.stopPropagation();
        var id = $(e.target).closest('.list__item').attr('id');
        e.dataTransfer.setData('text/entry', id);
        e.dataTransfer.effectAllowed = 'move';
        DragDropInfo.dragObject = this.items.get(id);
    }
});

_.extend(ListView.prototype, Resizable);
_.extend(ListView.prototype, Scrollable);

module.exports = ListView;
