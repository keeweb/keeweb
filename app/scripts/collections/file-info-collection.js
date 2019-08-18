const Backbone = require('backbone');
const FileInfoModel = require('../models/file-info-model');
const SettingsStore = require('../comp/settings-store');

const FileInfoCollection = Backbone.Collection.extend({
    model: FileInfoModel,

    initialize() {},

    load() {
        return SettingsStore.load('file-info').then(data => {
            if (data) {
                this.reset(data, { silent: true });
            }
        });
    },

    save() {
        SettingsStore.save('file-info', this.toJSON());
    },

    getLast() {
        return this.first();
    },

    getMatch(storage, name, path) {
        return this.find(fi => {
            return (
                (fi.get('storage') || '') === (storage || '') &&
                (fi.get('name') || '') === (name || '') &&
                (fi.get('path') || '') === (path || '')
            );
        });
    },

    getByName(name) {
        return this.find(file => file.get('name').toLowerCase() === name.toLowerCase());
    }
});

FileInfoCollection.instance = new FileInfoCollection();

module.exports = FileInfoCollection;
