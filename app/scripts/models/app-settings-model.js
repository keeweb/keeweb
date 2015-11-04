'use strict';

var Backbone = require('backbone'),
    Launcher = require('../comp/launcher');

var FileName = 'app-settings.json';

var AppSettingsModel = Backbone.Model.extend({
    defaults: {
        theme: 'd',
        lastOpenFile: ''
    },

    initialize: function() {
        this.listenTo(this, 'change', this.save);
    },

    load: function() {
        try {
            var data;
            if (Launcher) {
                data = JSON.parse(Launcher.readFile(Launcher.getUserDataPath(FileName), 'utf8'));
            } else if (typeof localStorage !== 'undefined' && localStorage.appSettings) {
                data = JSON.parse(localStorage.appSettings);
            }
            if (data) {
                this.set(data, {silent: true});
            }
        } catch (e) { /* TODO: log failed to load settings */ }
    },

    save: function() {
        try {
            if (Launcher) {
                Launcher.writeFile(Launcher.getUserDataPath(FileName), JSON.stringify(this.attributes));
            } else if (typeof localStorage !== 'undefined') {
                localStorage.appSettings = JSON.stringify(this.attributes);
            }
        } catch (e) { /* TODO: log failed to save settings */ }
    }
});

AppSettingsModel.instance = new AppSettingsModel();
AppSettingsModel.instance.load();

module.exports = AppSettingsModel;
