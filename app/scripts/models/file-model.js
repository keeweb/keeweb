'use strict';

var Backbone = require('backbone'),
    GroupCollection = require('../collections/group-collection'),
    GroupModel = require('./group-model'),
    kdbxweb = require('kdbxweb'),
    demoFileData = require('base64!../../resources/Demo.kdbx');

var FileModel = Backbone.Model.extend({
    defaults: {
        name: '',
        keyFileName: '',
        path: '',
        modified: false,
        open: false,
        opening: false,
        error: false,
        created: false,
        demo: false,
        groups: null
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
        this.set({ open: true, opening: false, error: false });
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
        this.set({ open: true, created: false, opening: false, error: false, name: 'Demo', demo: true });
    },

    readModel: function(topGroupTitle) {
        var groups = new GroupCollection();
        this.set({ groups: groups }, { silent: true });
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

    getData: function() {
        return this.db.save();
    },

    getXml: function() {
        return this.db.saveXml();
    }
});

module.exports = FileModel;
