import Backbone from 'backbone';
import FileInfoModel from '../models/file-info-model';
import SettingsStore from '../comp/settings-store';

const FileInfoCollection = Backbone.Collection.extend({
    model: FileInfoModel,

    initialize: function () {
    },

    load: function () {
        return SettingsStore.load('file-info').then(data => {
            if (data) {
                this.reset(data, {silent: true});
            }
        });
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

FileInfoCollection.instance = new FileInfoCollection();

export default FileInfoCollection;
