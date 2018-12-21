const Backbone = require('backbone');
const AttachmentModel = require('./attachment-model');
const IconMap = require('../const/icon-map');
const Color = require('../util/color');
const IconUrl = require('../util/icon-url');
const Otp = require('../util/otp');
const kdbxweb = require('kdbxweb');

const EntryModel = Backbone.Model.extend({
    defaults: {},

    urlRegex: /^https?:\/\//i,
    fieldRefRegex: /^\{REF:([TNPAU])@I:(\w{32})}$/,

    builtInFields: ['Title', 'Password', 'UserName', 'URL', 'Notes', 'TOTP Seed', 'TOTP Settings', '_etm_template_uuid'],
    fieldRefFields: ['title', 'password', 'user', 'url', 'notes'],
    fieldRefIds: { T: 'Title', U: 'UserName', P: 'Password', A: 'URL', N: 'Notes' },

    initialize: function() {
    },

    setEntry: function(entry, group, file) {
        this.entry = entry;
        this.group = group;
        this.file = file;
        if (this.get('uuid') === entry.uuid.id) {
            this._checkUpdatedEntry();
        }
        // we cannot calculate field references now because database index has not yet been built
        this.hasFieldRefs = false;
        this._fillByEntry();
        this.hasFieldRefs = true;
    },

    _fillByEntry: function() {
        const entry = this.entry;
        this.set({id: this.file.subId(entry.uuid.id), uuid: entry.uuid.id}, {silent: true});
        this.fileName = this.file.get('name');
        this.groupName = this.group.get('title');
        this.title = this._getFieldString('Title');
        this.password = entry.fields.Password || kdbxweb.ProtectedValue.fromString('');
        this.notes = this._getFieldString('Notes');
        this.url = this._getFieldString('URL');
        this.displayUrl = this._getDisplayUrl(this._getFieldString('URL'));
        this.user = this._getFieldString('UserName');
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
        this._buildAutoType();
        if (this.hasFieldRefs) {
            this.resolveFieldReferences();
        }
    },

    _getFieldString: function(field) {
        const val = this.entry.fields[field];
        if (!val) {
            return '';
        }
        if (val.isProtected) {
            return val.getText();
        }
        return val.toString();
    },

    _checkUpdatedEntry: function() {
        if (this.isJustCreated) {
            this.isJustCreated = false;
        }
        if (this.canBeDeleted) {
            this.canBeDeleted = false;
        }
        if (this.unsaved && +this.updated !== +this.entry.times.lastModTime) {
            this.unsaved = false;
        }
    },

    _buildSearchText: function() {
        let text = '';
        _.forEach(this.entry.fields, value => {
            if (typeof value === 'string') {
                text += value.toLowerCase() + '\n';
            }
        });
        this.entry.tags.forEach(tag => {
            text += tag.toLowerCase() + '\n';
        });
        this.attachments.forEach(att => {
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
        this.searchTags = this.entry.tags.map(tag => tag.toLowerCase());
    },

    _buildSearchColor: function() {
        this.searchColor = this.color;
    },

    _buildAutoType: function() {
        this.autoTypeEnabled = this.entry.autoType.enabled;
        this.autoTypeObfuscation = this.entry.autoType.obfuscation === kdbxweb.Consts.AutoTypeObfuscationOptions.UseClipboard;
        this.autoTypeSequence = this.entry.autoType.defaultSequence;
        this.autoTypeWindows = this.entry.autoType.items.map(this._convertAutoTypeItem);
    },

    _convertAutoTypeItem: function(item) {
        return { window: item.window, sequence: item.keystrokeSequence };
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
        const att = [];
        _.forEach(binaries, (data, title) => {
            if (data && data.ref) {
                data = data.value;
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

    setSaved: function() {
        if (this.unsaved) {
            this.unsaved = false;
        }
        if (this.canBeDeleted) {
            this.canBeDeleted = false;
        }
    },

    matches: function(filter) {
        return !filter ||
            (!filter.tagLower || this.searchTags.indexOf(filter.tagLower) >= 0) &&
            (!filter.textLower || (filter.advanced ? this.matchesAdv(filter) : this.searchText.indexOf(filter.textLower) >= 0)) &&
            (!filter.color || filter.color === true && this.searchColor || this.searchColor === filter.color) &&
            (!filter.autoType || this.autoTypeEnabled);
    },

    matchesAdv: function(filter) {
        const adv = filter.advanced;
        let search,
            match;
        if (adv.regex) {
            try {
                search = new RegExp(filter.text, adv.cs ? '' : 'i');
            } catch (e) { return false; }
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
            for (let i = 0, len = this.entry.history.length; i < len; i++) {
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
        const matchField = this.matchField;
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
        if (adv.title && matchField(entry, 'Title', compare, search)) {
            return true;
        }
        let matches = false;
        if (adv.other || adv.protect) {
            const builtInFields = this.builtInFields;
            const fieldNames = Object.keys(entry.fields);
            matches = fieldNames.some(field => {
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
        const val = entry.fields[field];
        return val ? compare(val, search) : false;
    },

    resolveFieldReferences: function() {
        this.hasFieldRefs = false;
        this.fieldRefFields.forEach(field => {
            const fieldValue = this[field];
            const refValue = this._resolveFieldReference(fieldValue);
            if (refValue !== undefined) {
                this[field] = refValue;
                this.hasFieldRefs = true;
            }
        });
    },

    getFieldValue: function(field) {
        field = field.toLowerCase();
        let resolvedField;
        Object.keys(this.entry.fields).some(entryField => {
            if (entryField.toLowerCase() === field) {
                resolvedField = entryField;
                return true;
            }
        });
        if (resolvedField) {
            let fieldValue = this.entry.fields[resolvedField];
            const refValue = this._resolveFieldReference(fieldValue);
            if (refValue !== undefined) {
                fieldValue = refValue;
            }
            return fieldValue;
        }
    },

    _resolveFieldReference: function(fieldValue) {
        if (!fieldValue) {
            return;
        }
        if (fieldValue.isProtected && fieldValue.isFieldReference()) {
            fieldValue = fieldValue.getText();
        }
        if (typeof fieldValue !== 'string') {
            return;
        }
        const match = fieldValue.match(this.fieldRefRegex);
        if (!match) {
            return;
        }
        return this._getReferenceValue(match[1], match[2]);
    },

    _getReferenceValue: function(fieldRefId, idStr) {
        const id = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            id[i] = parseInt(idStr.substr(i * 2, 2), 16);
        }
        const uuid = new kdbxweb.KdbxUuid(id);
        const entry = this.file.getEntry(this.file.subId(uuid.id));
        if (!entry) {
            return;
        }
        return entry.entry.fields[this.fieldRefIds[fieldRefId]];
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

    renameTag: function(from, to) {
        const ix = _.findIndex(this.entry.tags, tag => tag.toLowerCase() === from.toLowerCase());
        if (ix < 0) {
            return;
        }
        this._entryModified();
        this.entry.tags.splice(ix, 1);
        if (to) {
            this.entry.tags.push(to);
        }
        this._fillByEntry();
    },

    setField: function(field, val, allowEmpty) {
        const hasValue = val && (typeof val === 'string' || val.isProtected && val.byteLength);
        if (hasValue || allowEmpty || this.builtInFields.indexOf(field) >= 0) {
            this._entryModified();
            this.entry.fields[field] = val;
        } else if (this.entry.fields.hasOwnProperty(field)) {
            this._entryModified();
            delete this.entry.fields[field];
        }
        this._fillByEntry();
    },

    hasField: function(field) {
        return this.entry.fields.hasOwnProperty(field);
    },

    addAttachment: function(name, data) {
        this._entryModified();
        return this.file.db.createBinary(data).then(binaryRef => {
            this.entry.binaries[name] = binaryRef;
            this._fillByEntry();
        });
    },

    removeAttachment: function(name) {
        this._entryModified();
        delete this.entry.binaries[name];
        this._fillByEntry();
    },

    getHistory: function() {
        const history = this.entry.history.map(function(rec) {
            return EntryModel.fromEntry(rec, this.group, this.file);
        }, this);
        history.push(this);
        history.sort((x, y) => x.updated - y.updated);
        return history;
    },

    deleteHistory: function(historyEntry) {
        const ix = this.entry.history.indexOf(historyEntry);
        if (ix >= 0) {
            this.entry.removeHistory(ix);
            this.file.setModified();
        }
        this._fillByEntry();
    },

    revertToHistoryState: function(historyEntry) {
        const ix = this.entry.history.indexOf(historyEntry);
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
            const historyEntry = this.entry.history[this.entry.history.length - 1];
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
        if (this.canBeDeleted) {
            const ix = this.group.group.entries.indexOf(this.entry);
            if (ix >= 0) {
                this.group.group.entries.splice(ix, 1);
            }
            this.file.reload();
        }
    },

    moveToFile: function(file) {
        if (this.canBeDeleted) {
            this.removeWithoutHistory();
            this.group = file.get('groups').first();
            this.file = file;
            this._fillByEntry();
            this.entry.times.update();
            this.group.group.entries.push(this.entry);
            this.group.addEntry(this);
            this.isJustCreated = true;
            this.unsaved = true;
            this.file.setModified();
        }
    },

    initOtpGenerator: function() {
        let otpUrl;
        if (this.fields.otp) {
            otpUrl = this.fields.otp;
            if (otpUrl.isProtected) {
                otpUrl = otpUrl.getText();
            }
            if (Otp.isSecret(otpUrl.replace(/\s/g, ''))) {
                otpUrl = Otp.makeUrl(otpUrl.replace(/\s/g, '').toUpperCase());
            } else if (otpUrl.toLowerCase().lastIndexOf('otpauth:', 0) !== 0) {
                // KeeOTP plugin format
                const args = {};
                otpUrl.split('&').forEach(part => {
                    const parts = part.split('=', 2);
                    args[parts[0]] = decodeURIComponent(parts[1]).replace(/=/g, '');
                });
                if (args.key) {
                    otpUrl = Otp.makeUrl(args.key, args.step, args.size);
                }
            }
        } else if (this.entry.fields['TOTP Seed']) {
            // TrayTOTP plugin format
            let secret = this.entry.fields['TOTP Seed'];
            if (secret.isProtected) {
                secret = secret.getText();
            }
            if (secret) {
                let settings = this.entry.fields['TOTP Settings'];
                if (settings && settings.isProtected) {
                    settings = settings.getText();
                }
                let period,
                    digits;
                if (settings) {
                    settings = settings.split(';');
                    if (settings.length > 0 && settings[0] > 0) {
                        period = settings[0];
                    }
                    if (settings.length > 1 && settings[1] > 0) {
                        digits = settings[1];
                    }
                }
                otpUrl = Otp.makeUrl(secret, period, digits);
                this.fields.otp = kdbxweb.ProtectedValue.fromString(otpUrl);
            }
        }
        if (otpUrl) {
            if (this.otpGenerator && this.otpGenerator.url === otpUrl) {
                return;
            }
            try {
                this.otpGenerator = Otp.parseUrl(otpUrl);
            } catch (e) {
                this.otpGenerator = null;
            }
        } else {
            this.otpGenerator = null;
        }
    },

    setOtp: function(otp) {
        this.otpGenerator = otp;
        this.setOtpUrl(otp.url);
    },

    setOtpUrl: function(url) {
        this.setField('otp', url ? kdbxweb.ProtectedValue.fromString(url) : undefined);
        delete this.entry.fields['TOTP Seed'];
        delete this.entry.fields['TOTP Settings'];
    },

    getEffectiveEnableAutoType: function() {
        if (typeof this.entry.autoType.enabled === 'boolean') {
            return this.entry.autoType.enabled;
        }
        return this.group.getEffectiveEnableAutoType();
    },

    getEffectiveAutoTypeSeq: function() {
        return this.entry.autoType.defaultSequence || this.group.getEffectiveAutoTypeSeq();
    },

    setEnableAutoType: function(enabled) {
        this._entryModified();
        this.entry.autoType.enabled = enabled;
        this._buildAutoType();
    },

    setAutoTypeObfuscation: function(enabled) {
        this._entryModified();
        this.entry.autoType.obfuscation =
            enabled ? kdbxweb.Consts.AutoTypeObfuscationOptions.UseClipboard : kdbxweb.Consts.AutoTypeObfuscationOptions.None;
        this._buildAutoType();
    },

    setAutoTypeSeq: function(seq) {
        this._entryModified();
        this.entry.autoType.defaultSequence = seq || undefined;
        this._buildAutoType();
    },

    getGroupPath: function() {
        let group = this.group;
        const groupPath = [];
        while (group) {
            groupPath.unshift(group.get('title'));
            group = group.parentGroup;
        }
        return groupPath;
    },

    cloneEntry: function(nameSuffix) {
        const newEntry = EntryModel.newEntry(this.group, this.file);
        const uuid = newEntry.entry.uuid;
        newEntry.entry.copyFrom(this.entry);
        newEntry.entry.uuid = uuid;
        newEntry.entry.times.update();
        newEntry.entry.times.creationTime = newEntry.entry.times.lastModTime;
        newEntry.entry.fields.Title = this.title + nameSuffix;
        newEntry._fillByEntry();
        this.file.reload();
        return newEntry;
    },

    copyFromTemplate: function(templateEntry) {
        const uuid = this.entry.uuid;
        this.entry.copyFrom(templateEntry.entry);
        this.entry.uuid = uuid;
        this.entry.times.update();
        this.entry.times.creationTime = this.entry.times.lastModTime;
        this.entry.fields.Title = '';
        this._fillByEntry();
    }
});

EntryModel.fromEntry = function(entry, group, file) {
    const model = new EntryModel();
    model.setEntry(entry, group, file);
    return model;
};

EntryModel.newEntry = function(group, file) {
    const model = new EntryModel();
    const entry = file.db.createEntry(group.group);
    model.setEntry(entry, group, file);
    model.entry.times.update();
    model.unsaved = true;
    model.isJustCreated = true;
    model.canBeDeleted = true;
    group.addEntry(model);
    file.setModified();
    return model;
};

module.exports = EntryModel;
