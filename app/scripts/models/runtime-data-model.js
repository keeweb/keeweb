'use strict';

var Backbone = require('backbone'),
    SettingsStore = require('../comp/settings-store');

var RuntimeDataModel = Backbone.Model.extend({
    defaults: {},

    initialize: function() {
        this.listenTo(this, 'change', this.save);
    },

    load: function() {
        var data = SettingsStore.load('runtime-data');
        if (data) {
            this.set(data, {silent: true});
        }
    },

    save: function() {
        SettingsStore.save('runtime-data', this.attributes);
    }
});

RuntimeDataModel.instance = new RuntimeDataModel();
RuntimeDataModel.instance.load();

module.exports = RuntimeDataModel;
