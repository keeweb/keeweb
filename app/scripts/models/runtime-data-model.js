'use strict';

const Backbone = require('backbone');
const SettingsStore = require('../comp/settings-store');

const RuntimeDataModel = Backbone.Model.extend({
    defaults: {},

    initialize: function() {
        this.listenTo(this, 'change', this.save);
    },

    load: function() {
        return new Promise((resolve, reject) => {
            SettingsStore.load('runtime-data', (data, err) => {
                if (err) {
                    reject(err);
                } else {
                    this.onLoaded(data);
                    resolve();
                }
            });
        });
    },

    onLoaded: function(data) {
        if (data) {
            this.set(data, {silent: true});
        }
    },

    save: function() {
        SettingsStore.save('runtime-data', this.attributes);
    }
});

RuntimeDataModel.instance = new RuntimeDataModel();

module.exports = RuntimeDataModel;
