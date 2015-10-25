'use strict';

var Backbone = require('backbone');

var AppSettingsModel = Backbone.Model.extend({
    defaults: {
        theme: 'd',
        lastOpenFile: '',
        autoUpdate: true
    },

    initialize: function() {
        this.listenTo(this, 'change', this.save);
    },

    load: function() {
        if (typeof localStorage !== 'undefined' && localStorage.appSettings) {
            try {
                var data = JSON.parse(localStorage.appSettings);
                this.set(data, { silent: true });
            } catch (e) { /* failed to load settings */ }
        }
    },

    save: function() {
        if (typeof localStorage !== 'undefined') {
            localStorage.appSettings = JSON.stringify(this.attributes);
        }
    }
});

AppSettingsModel.instance = new AppSettingsModel();
AppSettingsModel.instance.load();

module.exports = AppSettingsModel;
