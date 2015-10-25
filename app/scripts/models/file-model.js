'use strict';

var Backbone = require('backbone'),
    GroupCollection = require('../collections/group-collection'),
    GroupModel = require('./group-model'),
    Launcher = require('../comp/launcher'),
    kdbxweb = require('kdbxweb'),
    demoFileData = require('base64!../../resources/Demo.kdbx');

var FileModel = Backbone.Model.extend({
    defaults: {
        name: '',
        keyFileName: '',
        passwordLength: 0,
        path: '',
        storage: null,
        modified: false,
        open: false,
        opening: false,
        error: false,
        created: false,
        demo: false,
        groups: null,
        oldPasswordLength: 0,
        oldKeyFileName: '',
        passwordChanged: false,
        keyFileChanged: false,
        syncing: false
    },

    db: null,

    initialize: function() {
    },

    open: function(password, fileData, keyFileData) {
        var len = password.value.length,
            byteLength = 0,
            value = new Uint8Array(len * 4),
            salt = kdbxweb.Random.getBytes(len * 4),
            ch, bytes;
        for (var i = 0; i < len; i++) {
            ch = String.fromCharCode(password.value.charCodeAt(i) ^ password.salt[i]);
            bytes = kdbxweb.ByteUtils.stringToBytes(ch);
            for (var j = 0; j < bytes.length; j++) {
                value[byteLength] = bytes[j] ^ salt[byteLength];
                byteLength++;
            }
        }
        password = new kdbxweb.ProtectedValue(value.buffer.slice(0, byteLength), salt.buffer.slice(0, byteLength));
        try {
            var credentials = new kdbxweb.Credentials(password, keyFileData);
            this.db = kdbxweb.Kdbx.load(fileData, credentials);
        } catch (e) {
            this.set({ error: true, opening: false });
            return;
        }
        this.readModel(this.get('name'));
        this.setOpenFile({ passwordLength: len });
    },

    create: function(name) {
        var password = kdbxweb.ProtectedValue.fromString('');
        var credentials = new kdbxweb.Credentials(password);
        this.db = kdbxweb.Kdbx.create(credentials, name);
        this.readModel();
        this.set({ open: true, created: true, opening: false, error: false, name: name });
    },

    createDemo: function() {
        var password = kdbxweb.ProtectedValue.fromString('demo');
        var credentials = new kdbxweb.Credentials(password);
        var demoFile = kdbxweb.ByteUtils.arrayToBuffer(kdbxweb.ByteUtils.base64ToBytes(demoFileData));
        this.db = kdbxweb.Kdbx.load(demoFile, credentials);
        this.readModel();
        this.setOpenFile({ passwordLength: 4, demo: true, name: 'Demo' });
    },

    setOpenFile: function(props) {
        _.extend(props, {
            open: true,
            opening: false,
            error: false,
            oldKeyFileName: this.get('keyFileName'),
            oldPasswordLength: props.passwordLength,
            passwordChanged: false,
            keyFileChanged: false
        });
        this.set(props);
        this._oldPasswordHash = this.db.credentials.passwordHash;
        this._oldKeyFileHash = this.db.credentials.keyFileHash;
        this._oldKeyChangeDate = this.db.meta.keyChanged;
    },

    readModel: function(topGroupTitle) {
        var groups = new GroupCollection();
        this.set({
            groups: groups,
            defaultUser: this.db.meta.defaultUser,
            recycleBinEnabled: this.db.meta.recycleBinEnabled,
            historyMaxItems: this.db.meta.historyMaxItems,
            historyMaxSize: this.db.meta.historyMaxSize,
            keyEncryptionRounds: this.db.header.keyEncryptionRounds
        }, { silent: true });
        this.db.groups.forEach(function(group, index) {
            var groupModel = GroupModel.fromGroup(group, this);
            if (index === 0 && topGroupTitle) {
                groupModel.set({title: topGroupTitle});
            }
            groups.add(groupModel);
        }, this);
    },

    getGroup: function(id) {
        var found = null;
        if (id) {
            this.forEachGroup(function (group) {
                if (group.get('id') === id) {
                    found = group;
                    return false;
                }
            }, true);
        }
        return found;
    },

    forEachEntry: function(filter, callback) {
        var top = this;
        if (filter.trash) {
            top = this.getGroup(this.db.meta.recycleBinUuid ? this.db.meta.recycleBinUuid.id : null);
        } else if (filter.group) {
            top = this.getGroup(filter.group);
        }
        if (top) {
            if (top.forEachOwnEntry) {
                top.forEachOwnEntry(filter, callback);
            }
            top.forEachGroup(function (group) {
                group.forEachOwnEntry(filter, callback);
            });
        }
    },

    forEachGroup: function(callback, includeDisabled) {
        this.get('groups').forEach(function(group) {
            if (callback(group) !== false) {
                group.forEachGroup(callback, includeDisabled);
            }
        });
    },

    getTrashGroup: function() {
        return this.db.meta.recycleBinEnabled ? this.getGroup(this.db.meta.recycleBinUuid.id) : null;
    },

    setModified: function() {
        if (!this.get('demo')) {
            this.set('modified', true);
        }
    },

    autoSave: function() {
        Launcher.writeFile(this.get('path'), this.getData());
    },

    getData: function() {
        return this.db.save();
    },

    getXml: function() {
        return this.db.saveXml();
    },

    saved: function(path, storage) {
        this.set({ path: path || '', storage: storage || null, modified: false, created: false, syncing: false });
        this.setOpenFile({ passwordLength: this.get('passwordLength') });
        this.forEachEntry({}, function(entry) {
            entry.unsaved = false;
        });
    },

    setPassword: function(password) {
        this.db.credentials.setPassword(password);
        this.db.meta.keyChanged = new Date();
        this.set({ passwordLength: password.byteLength, passwordChanged: true });
        this.setModified();
    },

    resetPassword: function() {
        this.db.credentials.passwordHash = this._oldPasswordHash;
        if (this.db.credentials.keyFileHash === this._oldKeyFileHash) {
            this.db.meta.keyChanged = this._oldKeyChangeDate;
        }
        this.set({ passwordLength: this.get('oldPasswordLength'), passwordChanged: false });
    },

    setKeyFile: function(keyFile, keyFileName) {
        this.db.credentials.setKeyFile(keyFile);
        this.db.meta.keyChanged = new Date();
        this.set({ keyFileName: keyFileName, keyFileChanged: true });
        this.setModified();
    },

    generateAndSetKeyFile: function() {
        var keyFile = kdbxweb.Credentials.createRandomKeyFile();
        var keyFileName = 'Generated';
        this.setKeyFile(keyFile, keyFileName);
        return keyFile;
    },

    resetKeyFile: function() {
        this.db.credentials.keyFileHash = this._oldKeyFileHash;
        if (this.db.credentials.passwordHash === this._oldPasswordHash) {
            this.db.meta.keyChanged = this._oldKeyChangeDate;
        }
        this.set({ keyFileName: this.get('oldKeyFileName'), keyFileChanged: false });
    },

    removeKeyFile: function() {
        this.db.credentials.keyFileHash = null;
        var changed = !!this._oldKeyFileHash;
        if (!changed && this.db.credentials.passwordHash === this._oldPasswordHash) {
            this.db.meta.keyChanged = this._oldKeyChangeDate;
        }
        this.set({ keyFileName: '', keyFileChanged: changed });
    },

    setName: function(name) {
        this.db.meta.name = name;
        this.db.meta.nameChanged = new Date();
        this.set('name', name);
        this.setModified();
    },

    setDefaultUser: function(defaultUser) {
        this.db.meta.defaultUser = defaultUser;
        this.db.meta.defaultUserChanged = new Date();
        this.set('defaultUser', defaultUser);
        this.setModified();
    },

    setRecycleBinEnabled: function(enabled) {
        enabled = !!enabled;
        this.db.meta.recycleBinEnabled = enabled;
        if (enabled) {
            this.db.createRecycleBin();
        }
        this.set('setRecycleBinEnabled', enabled);
        this.setModified();
    },

    setHistoryMaxItems: function(count) {
        this.db.meta.historyMaxItems = count;
        this.set('historyMaxItems', count);
        this.setModified();
    },

    setHistoryMaxSize: function(size) {
        this.db.meta.historyMaxSize = size;
        this.set('historyMaxSize', size);
        this.setModified();
    },

    setKeyEncryptionRounds: function(rounds) {
        this.db.header.keyEncryptionRounds = rounds;
        this.set('keyEncryptionRounds', rounds);
        this.setModified();
    }
});

module.exports = FileModel;
