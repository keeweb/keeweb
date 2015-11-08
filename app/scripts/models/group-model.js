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
        filterKey: 'group',
        editable: true,
        top: false,
        drag: true,
        drop: true
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
            expanded: true,
            visible: !isRecycleBin,
            items: new GroupCollection(),
            filterValue: group.uuid.id
        }, { silent: true });
        this.group = group;
        this.file = file;
        this._fillByGroup(true);
        var items = this.get('items'),
            entries = this.get('entries');
        group.groups.forEach(function(subGroup) {
            items.add(GroupModel.fromGroup(subGroup, file, this));
        }, this);
        group.entries.forEach(function(entry) {
            entries.add(EntryModel.fromEntry(entry, this, file));
        }, this);
    },

    _fillByGroup: function(silent) {
        this.set({
            title: this.group.name,
            iconId: this.group.icon,
            icon: this._iconFromId(this.group.icon)
        }, { silent: silent });
    },

    _iconFromId: function(id) {
        if (id === KdbxIcons.Folder || id === KdbxIcons.FolderOpen) {
            return undefined;
        }
        return IconMap[id];
    },

    _groupModified: function() {
        this.file.setModified();
        if (this.isJustCreated) {
            this.isJustCreated = false;
        }
        this.group.times.update();
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

    getOwnSubGroups: function() {
        return this.group.groups;
    },

    removeEntry: function(entry) {
        this.get('entries').remove(entry);
    },

    addEntry: function(entry) {
        this.get('entries').add(entry);
    },

    removeGroup: function(group) {
        this.get('items').remove(group);
        this.trigger('remove', group);
    },

    addGroup: function(group) {
        this.get('items').add(group);
        this.trigger('insert', group);
    },

    setName: function(name) {
        this._groupModified();
        this.group.name = name;
        this._fillByGroup();
    },

    setIcon: function(iconId) {
        this._groupModified();
        this.group.icon = iconId;
        this._fillByGroup();
    },

    moveToTrash: function() {
        this.file.setModified();
        this.file.db.remove(this.group);
        this.parentGroup.removeGroup(this);
        var trashGroup = this.file.getTrashGroup();
        if (trashGroup) {
            trashGroup.addGroup(this);
            this.parentGroup = trashGroup;
            this.deleted = true;
        }
        this.trigger('delete');
    },

    removeWithoutHistory: function() {
        var ix = this.parentGroup.group.groups.indexOf(this.group);
        if (ix >= 0) {
            this.parentGroup.group.groups.splice(ix, 1);
        }
        this.parentGroup.removeGroup(this);
        this.trigger('delete');
    },

    moveHere: function(object) {
        if (!object || object.id === this.id || object.file !== this.file) {
            return;
        }
        if (object instanceof GroupModel) {
            if (this.group.groups.indexOf(object.group) >= 0) {
                return;
            }
            this.file.db.move(object.group, this.group);
            object.parentGroup.removeGroup(object);
            object.trigger('delete');
            this.addGroup(object);
        } else if (object instanceof EntryModel) {
            if (this.group.entries.indexOf(object.entry) >= 0) {
                return;
            }
            this.file.db.move(object.entry, this.group);
            object.group.removeEntry(object);
            this.addEntry(object);
        }
    }
});

GroupModel.fromGroup = function(group, file, parentGroup) {
    var model = new GroupModel();
    model.setFromGroup(group, file);
    if (parentGroup) {
        model.parentGroup = parentGroup;
    } else {
        model.set({ top: true, drag: false }, { silent: true });
    }
    return model;
};

GroupModel.newGroup = function(group, file) {
    var model = new GroupModel();
    var grp = file.db.createGroup(group.group);
    model.setFromGroup(grp, file);
    model.group.times.update();
    model.parentGroup = group;
    model.unsaved = true;
    model.isJustCreated = true;
    group.addGroup(model);
    file.setModified();
    return model;
};

module.exports = GroupModel;
