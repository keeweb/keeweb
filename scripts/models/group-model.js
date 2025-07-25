import * as kdbxweb from 'kdbxweb';
import { IconMap } from 'const/icon-map';
import { EntryModel } from 'models/entry-model';
import { MenuItemModel } from 'models/menu/menu-item-model';
import { IconUrlFormat } from 'util/formatting/icon-url-format';
import { GroupCollection } from 'collections/group-collection';
import { EntryCollection } from 'collections/entry-collection';

const KdbxIcons = kdbxweb.Consts.Icons;

const DefaultAutoTypeSequence = '{USERNAME}{TAB}{PASSWORD}{ENTER}';

class GroupModel extends MenuItemModel {
    setGroup(group, file, parentGroup) {
        const isRecycleBin = group.uuid.equals(file.db.meta.recycleBinUuid);
        const id = file.subId(group.uuid.id);
        this.set(
            {
                id,
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
            },
            { silent: true }
        );
        this.group = group;
        this.file = file;
        this.parentGroup = parentGroup;
        this._fillByGroup(true);
        const items = this.items;
        const entries = this.entries;

        const itemsArray = group.groups.map((subGroup) => {
            let g = file.getGroup(file.subId(subGroup.uuid.id));
            if (g) {
                g.setGroup(subGroup, file, this);
            } else {
                g = GroupModel.fromGroup(subGroup, file, this);
            }
            return g;
        }, this);
        items.push(...itemsArray);

        const entriesArray = group.entries.map((entry) => {
            let e = file.getEntry(file.subId(entry.uuid.id));
            if (e) {
                e.setEntry(entry, this, file);
            } else {
                e = EntryModel.fromEntry(entry, this, file);
            }
            return e;
        }, this);
        entries.push(...entriesArray);
    }

    _fillByGroup(silent) {
        this.set(
            {
                title: this.parentGroup ? this.group.name : this.file.name,
                iconId: this.group.icon,
                icon: this._iconFromId(this.group.icon),
                customIcon: this._buildCustomIcon(),
                customIconId: this.group.customIcon ? this.group.customIcon.toString() : null,
                expanded: this.group.expanded !== false
            },
            { silent }
        );
    }

    _iconFromId(id) {
        if (id === KdbxIcons.Folder || id === KdbxIcons.FolderOpen) {
            return undefined;
        }
        return IconMap[id];
    }

    _buildCustomIcon() {
        this.customIcon = null;
        if (this.group.customIcon) {
            return IconUrlFormat.toDataUrl(
                this.file.db.meta.customIcons.get(this.group.customIcon.id)?.data
            );
        }
        return null;
    }

    _groupModified() {
        if (this.isJustCreated) {
            this.isJustCreated = false;
        }
        this.file.setModified();
        this.group.times.update();
    }

    forEachGroup(callback, filter) {
        let result = true;
        this.items.forEach((group) => {
            if (group.matches(filter)) {
                result =
                    callback(group) !== false && group.forEachGroup(callback, filter) !== false;
            }
        });
        return result;
    }

    forEachOwnEntry(filter, callback) {
        this.entries.forEach(function (entry) {
            if (entry.matches(filter)) {
                callback(entry, this);
            }
        });
    }

    matches(filter) {
        return (
            ((filter && filter.includeDisabled) ||
                (this.group.enableSearching !== false &&
                    !this.group.uuid.equals(this.file.db.meta.entryTemplatesGroup))) &&
            (!filter || !filter.autoType || this.group.enableAutoType !== false)
        );
    }

    getOwnSubGroups() {
        return this.group.groups;
    }

    addEntry(entry) {
        this.entries.push(entry);
    }

    addGroup(group) {
        this.items.push(group);
    }

    setName(name) {
        this._groupModified();
        this.group.name = name;
        this._fillByGroup();
    }

    setIcon(iconId) {
        this._groupModified();
        this.group.icon = iconId;
        this.group.customIcon = undefined;
        this._fillByGroup();
    }

    setCustomIcon(customIconId) {
        this._groupModified();
        this.group.customIcon = new kdbxweb.KdbxUuid(customIconId);
        this._fillByGroup();
    }

    setExpanded(expanded) {
        // this._groupModified(); // it's not good to mark the file as modified when a group is collapsed
        this.group.expanded = expanded;
        this.expanded = expanded;
    }

    setEnableSearching(enabled) {
        this._groupModified();
        let parentEnableSearching = true;
        let parentGroup = this.parentGroup;
        while (parentGroup) {
            if (typeof parentGroup.enableSearching === 'boolean') {
                parentEnableSearching = parentGroup.enableSearching;
                break;
            }
            parentGroup = parentGroup.parentGroup;
        }
        if (enabled === parentEnableSearching) {
            enabled = null;
        }
        this.group.enableSearching = enabled;
        this.enableSearching = this.group.enableSearching;
    }

    getEffectiveEnableSearching() {
        let grp = this;
        while (grp) {
            if (typeof grp.enableSearching === 'boolean') {
                return grp.enableSearching;
            }
            grp = grp.parentGroup;
        }
        return true;
    }

    setEnableAutoType(enabled) {
        this._groupModified();
        let parentEnableAutoType = true;
        let parentGroup = this.parentGroup;
        while (parentGroup) {
            if (typeof parentGroup.enableAutoType === 'boolean') {
                parentEnableAutoType = parentGroup.enableAutoType;
                break;
            }
            parentGroup = parentGroup.parentGroup;
        }
        if (enabled === parentEnableAutoType) {
            enabled = null;
        }
        this.group.enableAutoType = enabled;
        this.enableAutoType = this.group.enableAutoType;
    }

    getEffectiveEnableAutoType() {
        let grp = this;
        while (grp) {
            if (typeof grp.enableAutoType === 'boolean') {
                return grp.enableAutoType;
            }
            grp = grp.parentGroup;
        }
        return true;
    }

    setAutoTypeSeq(seq) {
        this._groupModified();
        this.group.defaultAutoTypeSeq = seq || undefined;
        this.autoTypeSeq = this.group.defaultAutoTypeSeq;
    }

    getEffectiveAutoTypeSeq() {
        let grp = this;
        while (grp) {
            if (grp.autoTypeSeq) {
                return grp.autoTypeSeq;
            }
            grp = grp.parentGroup;
        }
        return DefaultAutoTypeSequence;
    }

    getParentEffectiveAutoTypeSeq() {
        return this.parentGroup
            ? this.parentGroup.getEffectiveAutoTypeSeq()
            : DefaultAutoTypeSequence;
    }

    isEntryTemplatesGroup() {
        return this.group.uuid.equals(this.file.db.meta.entryTemplatesGroup);
    }

    moveToTrash() {
        this.file.setModified();
        this.file.db.remove(this.group);
        if (this.group.uuid.equals(this.file.db.meta.entryTemplatesGroup)) {
            this.file.db.meta.entryTemplatesGroup = undefined;
        }
        this.file.reload();
    }

    deleteFromTrash() {
        this.file.db.move(this.group, null);
        this.file.reload();
    }

    removeWithoutHistory() {
        const ix = this.parentGroup.group.groups.indexOf(this.group);
        if (ix >= 0) {
            this.parentGroup.group.groups.splice(ix, 1);
        }
        this.file.reload();
    }

    moveHere(object) {
        if (!object || object.id === this.id) {
            return;
        }
        if (object.file === this.file) {
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
        } else {
            if (object instanceof EntryModel) {
                this.file.setModified();
                const detachedEntry = object.detach();
                this.file.db.importEntry(detachedEntry, this.group, object.file.db);
                this.file.reload();
            } else {
                // moving groups between files is not supported for now
            }
        }
    }

    moveToTop(object) {
        if (
            !object ||
            object.id === this.id ||
            object.file !== this.file ||
            !(object instanceof GroupModel)
        ) {
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

    static fromGroup(group, file, parentGroup) {
        const model = new GroupModel();
        model.setGroup(group, file, parentGroup);
        return model;
    }

    static newGroup(group, file) {
        const model = new GroupModel();
        const grp = file.db.createGroup(group.group);
        model.setGroup(grp, file, group);
        model.group.times.update();
        model.isJustCreated = true;
        group.addGroup(model);
        file.setModified();
        file.reload();
        return model;
    }
}

GroupModel.defineModelProperties({
    id: '',
    uuid: '',
    iconId: 0,
    entries: null,
    filterKey: 'group',
    editable: true,
    top: false,
    drag: true,
    drop: true,
    enableSearching: true,
    enableAutoType: null,
    autoTypeSeq: null,
    group: null,
    file: null,
    parentGroup: null,
    customIconId: null,
    isJustCreated: false
});

export { GroupModel };
