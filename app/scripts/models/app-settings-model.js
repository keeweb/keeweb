'use strict';

var Backbone = require('backbone');

var AppSettingsModel = Backbone.Model.extend({
    defaults: {
        theme: 'd',
        genOpts: {
            length: 16, upper: true, lower: true, digits: true, special: false, brackets: false, high: false, ambiguous: false
        }
    },

    initialize: function() {
    },

    load: function() {
        if (typeof localStorage !== 'undefined' && localStorage.appSettings) {
            try {
                var data = JSON.parse(localStorage.appSettings);
                this.set(data);
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
