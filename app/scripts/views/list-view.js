'use strict';

var Backbone = require('backbone'),
    Resizable = require('../mixins/resizable'),
    Scrollable = require('../mixins/scrollable'),
    ListSearchView = require('./list-search-view'),
    EntryPresenter = require('../presenters/entry-presenter'),
    DragDropInfo = require('../comp/drag-drop-info'),
    AppSettingsModel = require('../models/app-settings-model');

var ListView = Backbone.View.extend({
    template: require('templates/list.hbs'),
    emptyTemplate: require('templates/list-empty.hbs'),

    events: {
        'click .list__item': 'itemClick',
        'dragstart .list__item': 'itemDragStart'
    },

    views: null,

    minWidth: 200,
    minHeight: 200,
    maxWidth: 500,
    maxHeight: 500,

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
        this.listenTo(this, 'view-resize', this.viewResized);
        this.listenTo(Backbone, 'filter', this.filterChanged);
        this.listenTo(Backbone, 'entry-updated', this.entryUpdated);

        this.listenTo(this.model.settings, 'change:tableView', this.setTableView);

        this.items = [];
    },

    render: function () {
        if (!this.itemsEl) {
            this.$el.html(this.template());
            this.itemsEl = this.$el.find('.list__items>.scroller');
            this.views.search.setElement(this.$el.find('.list__header')).render();
            this.setTableView();

            this.createScroll({
                root: this.$el.find('.list__items')[0],
                scroller: this.$el.find('.scroller')[0],
                bar: this.$el.find('.scroller__bar')[0]
            });
        }
        if (this.items.length) {
            var itemTemplate = this.getItemTemplate();
            var itemsTemplate = this.getItemsTemplate();
            var noColor = AppSettingsModel.instance.get('colorfulIcons') ? '' : 'grayscale';
            var presenter = new EntryPresenter(this.getDescField(), noColor, this.model.activeEntryId);
            var itemsHtml = '';
            this.items.forEach(function (item) {
                presenter.present(item);
                itemsHtml += itemTemplate(presenter);
            }, this);
            var html = itemsTemplate({ items: itemsHtml });
            this.itemsEl.html(html);
        } else {
            this.itemsEl.html(this.emptyTemplate());
        }
        this.pageResized();
        return this;
    },

    getItemsTemplate: function() {
        if (this.model.settings.get('tableView')) {
            return require('templates/list-table.hbs');
        } else {
            return this.renderPlainItems;
        }
    },

    renderPlainItems: function(itemsHtml) {
        return itemsHtml.items;
    },

    getItemTemplate: function() {
        if (this.model.settings.get('tableView')) {
            return require('templates/list-item-table.hbs');
        } else {
            return require('templates/list-item-short.hbs');
        }
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
        var ix = this.items.indexOf(this.items.get(this.model.activeEntryId));
        if (ix > 0) {
            this.selectItem(this.items.at(ix - 1));
        }
    },

    selectNext: function() {
        var ix = this.items.indexOf(this.items.get(this.model.activeEntryId));
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
        this.model.activeEntryId = item.id;
        Backbone.trigger('select-entry', item);
        this.itemsEl.find('.list__item--active').removeClass('list__item--active');
        var itemEl = document.getElementById(item.id);
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

    setTableView: function() {
        var isTable = this.model.settings.get('tableView');
        this.dragView.setCoord(isTable ? 'y' : 'x');
        this.setDefaultSize();
    },

    setDefaultSize: function() {
        this.setSize(this.model.settings.get('listViewWidth'));
    },

    setSize: function(size) {
        this.$el.css({ width: null, height: null });
        if (size) {
            this.$el.css('flex', '0 0 ' + size + 'px');
        } else {
            this.$el.css('flex', null);
        }
    },

    viewResized: function(size) {
        this.setSize(size);
        this.throttleSetViewSizeSetting(size);
    },

    throttleSetViewSizeSetting: _.throttle(function(size) {
        AppSettingsModel.instance.set('listViewWidth', size);
    }, 1000),

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
        e.originalEvent.dataTransfer.setData('text/entry', id);
        e.originalEvent.dataTransfer.effectAllowed = 'move';
        DragDropInfo.dragObject = this.items.get(id);
    }
});

_.extend(ListView.prototype, Resizable);
_.extend(ListView.prototype, Scrollable);

module.exports = ListView;
