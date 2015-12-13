'use strict';

var Backbone = require('backbone'),
    FileInfoModel = require('../models/file-info-model'),
    SettingsStore = require('../comp/settings-store');

var FileInfoCollection = Backbone.Collection.extend({
    model: FileInfoModel,

    initialize: function () {
    },

    load: function () {
        var data = SettingsStore.load('file-info');
        if (data) {
            this.reset(data, {silent: true});
        }
    },

    save: function () {
        SettingsStore.save('file-info', this.toJSON());
    },

    getLast: function () {
        return this.first();
    },

    getMatch: function (storage, name, path) {
        return this.find(function(fi) {
            return (fi.get('storage') || '') === (storage || '') &&
                (fi.get('name') || '') === (name || '') &&
                (fi.get('path') || '') === (path || '');
        });
    },

    getByName: function(name) {
        return this.find(function(file) { return file.get('name').toLowerCase() === name.toLowerCase(); });
    }
});

FileInfoCollection.load = function() {
    var coll = new FileInfoCollection();
    coll.load();
    return coll;
};

module.exports = FileInfoCollection;
