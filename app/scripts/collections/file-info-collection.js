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
        this.max(function(file) { return file.get('openDate'); });
    }
});

FileInfoCollection.load = function() {
    var coll = new FileInfoCollection();
    coll.load();
    return coll;
};

module.exports = FileInfoCollection;
