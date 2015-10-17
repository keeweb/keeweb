'use strict';

var MenuItemModel = require('./menu/menu-item-model'),
    EntryModel = require('../models/entry-model'),
    IconMap = require('../const/icon-map'),
    KdbxIcons = require('kdbxweb').Consts.Icons,
    GroupCollection, EntryCollection;

var GroupModel = MenuItemModel.extend({
    defaults: _.extend({}, MenuItemModel.prototype.defaults, {
        iconId: 0,
        entries: null,
        filterKey: 'group'
    }),

    initialize: function() {
        if (!GroupCollection) { GroupCollection = require('../collections/group-collection'); }
        if (!EntryCollection) { EntryCollection = require('../collections/entry-collection'); }
        this.set('entries', new EntryCollection());
    },

    setFromGroup: function(group, file) {
        var isRecycleBin = file.db.meta.recycleBinUuid && file.db.meta.recycleBinUuid.id === group.uuid.id;
        this.set({
            id: group.uuid.id,
            title: group.name,
            iconId: group.icon,
            icon: this._iconFromId(group.icon),
            expanded: true,
            visible: !isRecycleBin,
            items: new GroupCollection(),
            filterValue: group.uuid.id
        }, { silent: true });
        this.group = group;
        this.file = file;
        var items = this.get('items'),
            entries = this.get('entries');
        group.groups.forEach(function(subGroup) {
            items.add(GroupModel.fromGroup(subGroup, file));
        });
        group.entries.forEach(function(entry) {
            entries.add(EntryModel.fromEntry(entry, this, file));
        }, this);
    },

    _iconFromId: function(id) {
        if (id === KdbxIcons.Folder || id === KdbxIcons.FolderOpen) {
            return undefined;
        }
        return IconMap[id];
    },

    forEachGroup: function(callback, includeDisabled) {
        var result = true;
        this.get('items').forEach(function(group) {
            if (includeDisabled || group.group.enableSearching !== false) {
                result = callback(group) !== false && group.forEachGroup(callback, includeDisabled) !== false;
            }
        });
        return result;
    },

    forEachOwnEntry: function(filter, callback) {
        this.get('entries').forEach(function(entry) {
            if (entry.matches(filter)) {
                callback(entry, this);
            }
        });
    },

    removeEntry: function(entry) {
        this.get('entries').remove(entry);
    },

    addEntry: function(entry) {
        this.get('entries').add(entry);
    }
});

GroupModel.fromGroup = function(group, file) {
    var model = new GroupModel();
    model.setFromGroup(group, file);
    return model;
};

module.exports = GroupModel;
