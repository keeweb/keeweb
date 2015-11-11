'use strict';

var Backbone = require('backbone'),
    GroupCollection = require('../collections/group-collection'),
    GroupModel = require('./group-model'),
    Launcher = require('../comp/launcher'),
    DropboxLink = require('../comp/dropbox-link'),
    Storage = require('../comp/storage'),
    LastOpenFiles = require('../comp/last-open-files'),
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
        syncing: false,
        availOffline: false,
        offline: false
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
            var start = performance.now();
            kdbxweb.Kdbx.load(fileData, credentials, (function(db, err) {
                if (err) {
                    this.set({error: true, opening: false});
                    console.error('Error opening file', err.code, err.message, err);
                } else {
                    this.db = db;
                    this.readModel(this.get('name'));
                    this.setOpenFile({ passwordLength: len });
                    if (keyFileData) {
                        kdbxweb.ByteUtils.zeroBuffer(keyFileData);
                    }
                    console.log('Opened file ' + this.get('name') + ': ' + Math.round(performance.now() - start) + 'ms, ' +
                        db.header.keyEncryptionRounds + ' rounds, ' + Math.round(fileData.byteLength / 1024) + ' kB');
                    this.postOpen(fileData);
                }
            }).bind(this));
        } catch (e) {
            console.error('Error opening file', e, e.code, e.message, e);
            this.set({ error: true, opening: false });
        }
    },

    postOpen: function(fileData) {
        var that = this;
        if (!this.get('offline')) {
            if (this.get('availOffline')) {
                Storage.cache.save(this.get('name'), fileData, function (err) {
                    if (err) {
                        that.set('availOffline', false);
                        if (!that.get('storage')) {
                            return;
                        }
                    }
                    that.addToLastOpenFiles(!err);
                });
            } else {
                if (this.get('storage')) {
                    this.addToLastOpenFiles(false);
                }
                Storage.cache.remove(this.get('name'));
            }
        }
    },

    addToLastOpenFiles: function(hasOfflineCache) {
        LastOpenFiles.add(this.get('name'), this.get('storage'), this.get('path'), hasOfflineCache);
    },

    create: function(name) {
        var password = kdbxweb.ProtectedValue.fromString('');
        var credentials = new kdbxweb.Credentials(password);
        this.db = kdbxweb.Kdbx.create(credentials, name);
        this.readModel();
        this.set({ open: true, created: true, opening: false, error: false, name: name, offline: false });
    },

    createDemo: function() {
        var password = kdbxweb.ProtectedValue.fromString('demo');
        var credentials = new kdbxweb.Credentials(password);
        var demoFile = kdbxweb.ByteUtils.arrayToBuffer(kdbxweb.ByteUtils.base64ToBytes(demoFileData));
        kdbxweb.Kdbx.load(demoFile, credentials, (function(db) {
            this.db = db;
            this.readModel();
            this.setOpenFile({passwordLength: 4, demo: true, name: 'Demo'});
        }).bind(this));
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
            if (!filter.group || filter.subGroups) {
                top.forEachGroup(function (group) {
                    group.forEachOwnEntry(filter, callback);
                });
            }
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
        var that = this;
        that.set('syncing', true);
        switch (that.get('storage')) {
            case 'file':
                that.getData(function(data) {
                    Launcher.writeFile(that.get('path'), data);
                    that.saved(that.get('path'), that.get('storage'));
                });
                break;
            case 'dropbox':
                that.getData(function(data) {
                    DropboxLink.saveFile(that.get('path'), data, true, function (err) {
                        if (!err) {
                            that.saved(that.get('path'), that.get('storage'));
                        }
                    });
                });
                break;
            default:
                throw 'Unknown storage; cannot auto save';
        }
    },

    getData: function(cb) {
        var data = this.db.save(cb);

        return data;
    },

    getXml: function(cb) {
        this.db.saveXml(cb);
    },

    saved: function(path, storage) {
        this.set({ path: path || '', storage: storage || null, modified: false, created: false, syncing: false });
        this.setOpenFile({ passwordLength: this.get('passwordLength') });
        this.forEachEntry({}, function(entry) {
            entry.unsaved = false;
        });
        this.addToLastOpenFiles();
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
        this.get('groups').first().setName(name);
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
    },

    emptyTrash: function() {
        var trashGroup = this.getTrashGroup();
        if (trashGroup) {
            trashGroup.getOwnSubGroups().slice().forEach(function(group) {
                this.db.move(group, null);
            }, this);
            trashGroup.group.entries.forEach(function(entry) {
                this.db.move(entry, null);
            }, this);
            trashGroup.get('entries').reset();
        }
    }
});

module.exports = FileModel;
