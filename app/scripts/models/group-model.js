const MenuItemModel = require('./menu/menu-item-model');
const EntryModel = require('../models/entry-model');
const IconMap = require('../const/icon-map');
const IconUrl = require('../util/icon-url');
const kdbxweb = require('kdbxweb');
const KdbxIcons = kdbxweb.Consts.Icons;
let GroupCollection;
let EntryCollection;

const DefaultAutoTypeSequence = '{USERNAME}{TAB}{PASSWORD}{ENTER}';

const GroupModel = MenuItemModel.extend({
    defaults: _.extend({}, MenuItemModel.prototype.defaults, {
        iconId: 0,
        entries: null,
        filterKey: 'group',
        editable: true,
        top: false,
        drag: true,
        drop: true,
        enableSearching: true,
        enableAutoType: null,
        autoTypeSeq: null
    }),

    initialize: function() {
        if (!GroupCollection) { GroupCollection = require('../collections/group-collection'); }
        if (!EntryCollection) { EntryCollection = require('../collections/entry-collection'); }
    },

    setGroup: function(group, file, parentGroup) {
        const isRecycleBin = group.uuid.equals(file.db.meta.recycleBinUuid);
        const id = file.subId(group.uuid.id);
        this.set({
            id: id,
            uuid: group.uuid.id,
            expanded: group.expanded,
            visible: !isRecycleBin,
            items: new GroupCollection(),
            entries: new EntryCollection(),
            filterValue: id,
            enableSearching: group.enableSearching,
            enableAutoType: group.enableAutoType,
            autoTypeSeq: group.defaultAutoTypeSeq,
            top: !parentGroup,
            drag: !!parentGroup,
            collapsible: !!parentGroup
        }, { silent: true });
        this.group = group;
        this.file = file;
        this.parentGroup = parentGroup;
        this._fillByGroup(true);
        const items = this.get('items');
        const entries = this.get('entries');

        const itemsArray = group.groups.map(subGroup => {
            let g = file.getGroup(file.subId(subGroup.uuid.id));
            if (g) {
                g.setGroup(subGroup, file, this);
            } else {
                g = GroupModel.fromGroup(subGroup, file, this);
            }
            return g;
        }, this);
        items.add(itemsArray);

        const entriesArray = group.entries.map(entry => {
            let e = file.getEntry(file.subId(entry.uuid.id));
            if (e) {
                e.setEntry(entry, this, file);
            } else {
                e = EntryModel.fromEntry(entry, this, file);
            }
            return e;
        }, this);
        entries.add(entriesArray);
    },

    _fillByGroup: function(silent) {
        this.set({
            title: this.parentGroup ? this.group.name : this.file.get('name'),
            iconId: this.group.icon,
            icon: this._iconFromId(this.group.icon),
            customIcon: this._buildCustomIcon(),
            customIconId: this.group.customIcon ? this.group.customIcon.toString() : null,
            expanded: this.group.expanded !== false
        }, { silent: silent });
    },

    _iconFromId: function(id) {
        if (id === KdbxIcons.Folder || id === KdbxIcons.FolderOpen) {
            return undefined;
        }
        return IconMap[id];
    },

    _buildCustomIcon: function() {
        this.customIcon = null;
        if (this.group.customIcon) {
            return IconUrl.toDataUrl(this.file.db.meta.customIcons[this.group.customIcon]);
        }
        return null;
    },

    _groupModified: function() {
        if (this.isJustCreated) {
            this.isJustCreated = false;
        }
        this.file.setModified();
        this.group.times.update();
    },

    forEachGroup: function(callback, filter) {
        let result = true;
        this.get('items').forEach(group => {
            if (group.matches(filter)) {
                result = callback(group) !== false && group.forEachGroup(callback, filter) !== false;
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

    matches: function(filter) {
        return (filter && filter.includeDisabled ||
                this.group.enableSearching !== false &&
                !this.group.uuid.equals(this.file.db.meta.entryTemplatesGroup)
        ) && (!filter || !filter.autoType || this.group.enableAutoType !== false);
    },

    getOwnSubGroups: function() {
        return this.group.groups;
    },

    addEntry: function(entry) {
        this.get('entries').add(entry);
    },

    addGroup: function(group) {
        this.get('items').add(group);
    },

    setName: function(name) {
        this._groupModified();
        this.group.name = name;
        this._fillByGroup();
    },

    setIcon: function(iconId) {
        this._groupModified();
        this.group.icon = iconId;
        this.group.customIcon = undefined;
        this._fillByGroup();
    },

    setCustomIcon: function(customIconId) {
        this._groupModified();
        this.group.customIcon = new kdbxweb.KdbxUuid(customIconId);
        this._fillByGroup();
    },

    setExpanded: function(expanded) {
        // this._groupModified(); // it's not good to mark the file as modified when a group is collapsed
        this.group.expanded = expanded;
        this.set('expanded', expanded);
    },

    setEnableSearching: function(enabled) {
        this._groupModified();
        let parentEnableSearching = true;
        let parentGroup = this.parentGroup;
        while (parentGroup) {
            if (typeof parentGroup.get('enableSearching') === 'boolean') {
                parentEnableSearching = parentGroup.get('enableSearching');
                break;
            }
            parentGroup = parentGroup.parentGroup;
        }
        if (enabled === parentEnableSearching) {
            enabled = null;
        }
        this.group.enableSearching = enabled;
        this.set('enableSearching', this.group.enableSearching);
    },

    getEffectiveEnableSearching: function() {
        let grp = this;
        while (grp) {
            if (typeof grp.get('enableSearching') === 'boolean') {
                return grp.get('enableSearching');
            }
            grp = grp.parentGroup;
        }
        return true;
    },

    setEnableAutoType: function(enabled) {
        this._groupModified();
        let parentEnableAutoType = true;
        let parentGroup = this.parentGroup;
        while (parentGroup) {
            if (typeof parentGroup.get('enableAutoType') === 'boolean') {
                parentEnableAutoType = parentGroup.get('enableAutoType');
                break;
            }
            parentGroup = parentGroup.parentGroup;
        }
        if (enabled === parentEnableAutoType) {
            enabled = null;
        }
        this.group.enableAutoType = enabled;
        this.set('enableAutoType', this.group.enableAutoType);
    },

    getEffectiveEnableAutoType: function() {
        let grp = this;
        while (grp) {
            if (typeof grp.get('enableAutoType') === 'boolean') {
                return grp.get('enableAutoType');
            }
            grp = grp.parentGroup;
        }
        return true;
    },

    setAutoTypeSeq: function(seq) {
        this._groupModified();
        this.group.defaultAutoTypeSeq = seq || undefined;
        this.set('autoTypeSeq', this.group.defaultAutoTypeSeq);
    },

    getEffectiveAutoTypeSeq: function() {
        let grp = this;
        while (grp) {
            if (grp.get('autoTypeSeq')) {
                return grp.get('autoTypeSeq');
            }
            grp = grp.parentGroup;
        }
        return DefaultAutoTypeSequence;
    },

    getParentEffectiveAutoTypeSeq: function() {
        return this.parentGroup ? this.parentGroup.getEffectiveAutoTypeSeq() : DefaultAutoTypeSequence;
    },

    isEntryTemplatesGroup: function() {
        return this.group.uuid.equals(this.file.db.meta.entryTemplatesGroup);
    },

    moveToTrash: function() {
        this.file.setModified();
        this.file.db.remove(this.group);
        if (this.group.uuid.equals(this.file.db.meta.entryTemplatesGroup)) {
            this.file.db.meta.entryTemplatesGroup = undefined;
        }
        this.file.reload();
    },

    deleteFromTrash: function() {
        this.file.db.move(this.group, null);
        this.file.reload();
    },

    removeWithoutHistory: function() {
        const ix = this.parentGroup.group.groups.indexOf(this.group);
        if (ix >= 0) {
            this.parentGroup.group.groups.splice(ix, 1);
        }
        this.file.reload();
    },

    moveHere: function(object) {
        if (!object || object.id === this.id || object.file !== this.file) {
            return;
        }
        this.file.setModified();
        if (object instanceof GroupModel) {
            for (let parent = this; parent; parent = parent.parentGroup) {
                if (object === parent) {
                    return;
                }
            }
            if (this.group.groups.indexOf(object.group) >= 0) {
                return;
            }
            this.file.db.move(object.group, this.group);
            this.file.reload();
        } else if (object instanceof EntryModel) {
            if (this.group.entries.indexOf(object.entry) >= 0) {
                return;
            }
            this.file.db.move(object.entry, this.group);
            this.file.reload();
        }
    },

    moveToTop: function(object) {
        if (!object || object.id === this.id || object.file !== this.file || !(object instanceof GroupModel)) {
            return;
        }
        this.file.setModified();
        for (let parent = this; parent; parent = parent.parentGroup) {
            if (object === parent) {
                return;
            }
        }
        let atIndex = this.parentGroup.group.groups.indexOf(this.group);
        const selfIndex = this.parentGroup.group.groups.indexOf(object.group);
        if (selfIndex >= 0 && selfIndex < atIndex) {
            atIndex--;
        }
        if (atIndex >= 0) {
            this.file.db.move(object.group, this.parentGroup.group, atIndex);
        }
        this.file.reload();
    }
});

GroupModel.fromGroup = function(group, file, parentGroup) {
    const model = new GroupModel();
    model.setGroup(group, file, parentGroup);
    return model;
};

GroupModel.newGroup = function(group, file) {
    const model = new GroupModel();
    const grp = file.db.createGroup(group.group);
    model.setGroup(grp, file, group);
    model.group.times.update();
    model.isJustCreated = true;
    group.addGroup(model);
    file.setModified();
    file.reload();
    return model;
};

module.exports = GroupModel;
