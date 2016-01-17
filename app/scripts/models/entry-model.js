'use strict';

var Backbone = require('backbone'),
    AttachmentModel = require('./attachment-model'),
    IconMap = require('../const/icon-map'),
    Color = require('../util/color'),
    IconUrl = require('../util/icon-url'),
    kdbxweb = require('kdbxweb');

var EntryModel = Backbone.Model.extend({
    defaults: {},
    urlRegex: /^https?:\/\//i,

    builtInFields: ['Title', 'Password', 'Notes', 'URL', 'UserName'],

    initialize: function() {
    },

    setEntry: function(entry, group, file) {
        this.entry = entry;
        this.group = group;
        this.file = file;
        if (this.id === entry.uuid.id) {
            this._checkUpdatedEntry();
        }
        this._fillByEntry();
    },

    _fillByEntry: function() {
        var entry = this.entry;
        this.set({id: entry.uuid.id}, {silent: true});
        this.fileName = this.file.get('name');
        this.title = entry.fields.Title || '';
        this.password = entry.fields.Password || kdbxweb.ProtectedValue.fromString('');
        this.notes = entry.fields.Notes || '';
        this.url = entry.fields.URL || '';
        this.displayUrl = this._getDisplayUrl(entry.fields.URL);
        this.user = entry.fields.UserName || '';
        this.iconId = entry.icon;
        this.icon = this._iconFromId(entry.icon);
        this.tags = entry.tags;
        this.color = this._colorToModel(entry.bgColor) || this._colorToModel(entry.fgColor);
        this.fields = this._fieldsToModel(entry.fields);
        this.attachments = this._attachmentsToModel(entry.binaries);
        this.created = entry.times.creationTime;
        this.updated = entry.times.lastModTime;
        this.expires = entry.times.expires ? entry.times.expiryTime : undefined;
        this.expired = entry.times.expires && entry.times.expiryTime <= new Date();
        this.historyLength = entry.history.length;
        this._buildCustomIcon();
        this._buildSearchText();
        this._buildSearchTags();
        this._buildSearchColor();
    },

    _checkUpdatedEntry: function() {
        if (this.isJustCreated) {
            this.isJustCreated = false;
        }
        if (this.unsaved && +this.updated !== +this.entry.times.lastModTime) {
            this.unsaved = false;
        }
    },

    _buildSearchText: function() {
        var text = '';
        _.forEach(this.entry.fields, function(value) {
            if (typeof value === 'string') {
                text += value.toLowerCase() + '\n';
            }
        });
        this.entry.tags.forEach(function(tag) {
            text += tag.toLowerCase() + '\n';
        });
        this.attachments.forEach(function(att) {
            text += att.title.toLowerCase() + '\n';
        });
        this.searchText = text;
    },

    _buildCustomIcon: function() {
        this.customIcon = null;
        this.customIconId = null;
        if (this.entry.customIcon) {
            this.customIcon = IconUrl.toDataUrl(this.file.db.meta.customIcons[this.entry.customIcon]);
            this.customIconId = this.entry.customIcon.toString();
        }
    },

    _buildSearchTags: function() {
        this.searchTags = this.entry.tags.map(function(tag) { return tag.toLowerCase(); });
    },

    _buildSearchColor: function() {
        this.searchColor = this.color;
    },

    _iconFromId: function(id) {
        return IconMap[id];
    },

    _getDisplayUrl: function(url) {
        if (!url) {
            return '';
        }
        return url.replace(this.urlRegex, '');
    },

    _colorToModel: function(color) {
        return color ? Color.getNearest(color) : null;
    },

    _fieldsToModel: function(fields) {
        return _.omit(fields, this.builtInFields);
    },

    _attachmentsToModel: function(binaries) {
        var att = [];
        _.forEach(binaries, function(data, title) {
            if (data && data.ref) {
                data = this.file.db.meta.binaries[data.ref];
            }
            if (data) {
                att.push(AttachmentModel.fromAttachment({data: data, title: title}));
            }
        }, this);
        return att;
    },

    _entryModified: function() {
        if (!this.unsaved) {
            this.unsaved = true;
            this.entry.pushHistory();
            this.file.setModified();
        }
        if (this.isJustCreated) {
            this.isJustCreated = false;
        }
        this.entry.times.update();
    },

    matches: function(filter) {
        return !filter ||
            (!filter.tagLower || this.searchTags.indexOf(filter.tagLower) >= 0) &&
            (!filter.textLower || (filter.advanced ? this.matchesAdv(filter) : this.searchText.indexOf(filter.textLower) >= 0)) &&
            (!filter.color || filter.color === true && this.searchColor || this.searchColor === filter.color);
    },

    matchesAdv: function(filter) {
        var adv = filter.advanced;
        var search, match;
        if (adv.regex) {
            try { search = new RegExp(filter.text, adv.cs ? '' : 'i'); }
            catch (e) { return false; }
            match = this.matchRegex;
        } else if (adv.cs) {
            search = filter.text;
            match = this.matchString;
        } else {
            search = filter.textLower;
            match = this.matchStringLower;
        }
        if (this.matchEntry(this.entry, adv, match, search)) {
            return true;
        }
        if (adv.history) {
            for (var i = 0, len = this.entry.history.length; i < len; i++) {
                if (this.matchEntry(this.entry.history[0], adv, match, search)) {
                    return true;
                }
            }
        }
        return false;
    },

    matchString: function(str, find) {
        if (str.isProtected) {
            return str.includes(find);
        }
        return str.indexOf(find) >= 0;
    },

    matchStringLower: function(str, findLower) {
        if (str.isProtected) {
            return str.includesLower(findLower);
        }
        return str.toLowerCase().indexOf(findLower) >= 0;
    },

    matchRegex: function(str, regex) {
        if (str.isProtected) {
            str = str.getText();
        }
        return regex.test(str);
    },

    matchEntry: function(entry, adv, compare, search) {
        var matchField = this.matchField;
        if (adv.user && matchField(entry, 'UserName', compare, search)) {
            return true;
        }
        if (adv.url && matchField(entry, 'URL', compare, search)) {
            return true;
        }
        if (adv.notes && matchField(entry, 'Notes', compare, search)) {
            return true;
        }
        if (adv.pass && matchField(entry, 'Password', compare, search)) {
            return true;
        }
        if (adv.other && matchField(entry, 'Title', compare, search)) {
            return true;
        }
        var matches = false;
        if (adv.other || adv.protect) {
            var builtInFields = this.builtInFields;
            var fieldNames = Object.keys(entry.fields);
            matches = fieldNames.some(function (field) {
                if (builtInFields.indexOf(field) >= 0) {
                    return false;
                }
                if (typeof entry.fields[field] === 'string') {
                    return adv.other && matchField(entry, field, compare, search);
                } else {
                    return adv.protect && matchField(entry, field, compare, search);
                }
            });
        }
        return matches;
    },

    matchField: function(entry, field, compare, search) {
        var val = entry.fields[field];
        return val ? compare(val, search) : false;
    },

    setColor: function(color) {
        this._entryModified();
        this.entry.bgColor = Color.getKnownBgColor(color);
        this._fillByEntry();
    },

    setIcon: function(iconId) {
        this._entryModified();
        this.entry.icon = iconId;
        this.entry.customIcon = undefined;
        this._fillByEntry();
    },

    setCustomIcon: function(customIconId) {
        this._entryModified();
        this.entry.customIcon = new kdbxweb.KdbxUuid(customIconId);
        this._fillByEntry();
    },

    setExpires: function(dt) {
        this._entryModified();
        this.entry.times.expiryTime = dt instanceof Date ? dt : undefined;
        this.entry.times.expires = !!dt;
        this._fillByEntry();
    },

    setTags: function(tags) {
        this._entryModified();
        this.entry.tags = tags;
        this._fillByEntry();
    },

    setField: function(field, val) {
        this._entryModified();
        var hasValue = val && (typeof val === 'string' || val.isProtected && val.byteLength);
        if (hasValue || this.builtInFields.indexOf(field) >= 0) {
            this.entry.fields[field] = val;
        } else {
            delete this.entry.fields[field];
        }
        this._fillByEntry();
    },

    hasField: function(field) {
        return this.entry.fields.hasOwnProperty(field);
    },

    addAttachment: function(name, data) {
        this._entryModified();
        var binaryId;
        for (var i = 0; ; i++) {
            if (!this.file.db.meta.binaries[i]) {
                binaryId = i.toString();
                break;
            }
        }
        this.file.db.meta.binaries[binaryId] = data;
        this.entry.binaries[name] = { ref: binaryId };
        this._fillByEntry();
    },

    removeAttachment: function(name) {
        this._entryModified();
        delete this.entry.binaries[name];
        this._fillByEntry();
    },

    getHistory: function() {
        var history = this.entry.history.map(function(rec) {
            return EntryModel.fromEntry(rec, this.group, this.file);
        }, this);
        history.push(this);
        history.sort(function(x, y) { return x.updated - y.updated; });
        return history;
    },

    deleteHistory: function(historyEntry) {
        var ix = this.entry.history.indexOf(historyEntry);
        if (ix >= 0) {
            this.entry.removeHistory(ix);
        }
        this._fillByEntry();
    },

    revertToHistoryState: function(historyEntry) {
        var ix = this.entry.history.indexOf(historyEntry);
        if (ix < 0) {
            return;
        }
        this.entry.pushHistory();
        this.unsaved = true;
        this.file.setModified();
        this.entry.fields = {};
        this.entry.binaries = {};
        this.entry.copyFrom(historyEntry);
        this._entryModified();
        this._fillByEntry();
    },

    discardUnsaved: function() {
        if (this.unsaved && this.entry.history.length) {
            this.unsaved = false;
            var historyEntry = this.entry.history[this.entry.history.length - 1];
            this.entry.removeHistory(this.entry.history.length - 1);
            this.entry.fields = {};
            this.entry.binaries = {};
            this.entry.copyFrom(historyEntry);
            this._fillByEntry();
        }
    },

    moveToTrash: function() {
        this.file.setModified();
        if (this.isJustCreated) {
            this.isJustCreated = false;
        }
        this.file.db.remove(this.entry);
        this.file.reload();
    },

    deleteFromTrash: function() {
        this.file.setModified();
        this.file.db.move(this.entry, null);
        this.file.reload();
    },

    removeWithoutHistory: function() {
        var ix = this.group.group.entries.indexOf(this.entry);
        if (ix >= 0) {
            this.group.group.entries.splice(ix, 1);
        }
        this.file.reload();
    }
});

EntryModel.fromEntry = function(entry, group, file) {
    var model = new EntryModel();
    model.setEntry(entry, group, file);
    return model;
};

EntryModel.newEntry = function(group, file) {
    var model = new EntryModel();
    var entry = file.db.createEntry(group.group);
    model.setEntry(entry, group, file);
    model.entry.times.update();
    model.unsaved = true;
    model.isJustCreated = true;
    group.addEntry(model);
    file.setModified();
    return model;
};

module.exports = EntryModel;
