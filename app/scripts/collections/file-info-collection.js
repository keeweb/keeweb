'use strict';

const Backbone = require('backbone');
const FileInfoModel = require('../models/file-info-model');
const SettingsStore = require('../comp/settings-store');

const FileInfoCollection = Backbone.Collection.extend({
    model: FileInfoModel,

    initialize: function () {
    },

    load: function () {
        const data = SettingsStore.load('file-info');
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
        return this.find(fi => {
            return (fi.get('storage') || '') === (storage || '') &&
                (fi.get('name') || '') === (name || '') &&
                (fi.get('path') || '') === (path || '');
        });
    },

    getByName: function(name) {
        return this.find(file => file.get('name').toLowerCase() === name.toLowerCase());
    }
});

FileInfoCollection.load = function() {
    const coll = new FileInfoCollection();
    coll.load();
    return coll;
};

module.exports = FileInfoCollection;
