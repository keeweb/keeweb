'use strict';

var Backbone = require('backbone'),
    Launcher = require('../comp/launcher');

var FileName = 'app-settings.json';

var AppSettingsModel = Backbone.Model.extend({
    defaults: {
        theme: 'd',
        expandGroups: true,
        listViewWidth: null,
        menuViewWidth: null,
        tagsViewHeight: null,
        autoUpdate: 'install',
        clipboardSeconds: 0,
        autoSave: true,
        idleMinutes: 15,
        minimizeOnClose: false,
        tableView: false,
        colorfulIcons: false,
        lockOnMinimize: true
    },

    initialize: function() {
        this.listenTo(this, 'change', this.save);
    },

    load: function() {
        try {
            var data;
            if (Launcher) {
                var settingsFile = Launcher.getUserDataPath(FileName);
                if (Launcher.fileExists(settingsFile)) {
                    data = JSON.parse(Launcher.readFile(settingsFile, 'utf8'));
                }
            } else if (typeof localStorage !== 'undefined' && localStorage.appSettings) {
                data = JSON.parse(localStorage.appSettings);
            }
            if (data) {
                this.set(data, {silent: true});
            }
        } catch (e) {
            console.error('Error loading settings', e);
        }
    },

    save: function() {
        try {
            if (Launcher) {
                Launcher.writeFile(Launcher.getUserDataPath(FileName), JSON.stringify(this.attributes));
            } else if (typeof localStorage !== 'undefined') {
                localStorage.appSettings = JSON.stringify(this.attributes);
            }
        } catch (e) {
            console.error('Error saving settings', e);
        }
    }
});

AppSettingsModel.instance = new AppSettingsModel();
AppSettingsModel.instance.load();

module.exports = AppSettingsModel;
