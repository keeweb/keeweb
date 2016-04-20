'use strict';

var Backbone = require('backbone'),
    SettingsStore = require('../comp/settings-store');

var AppSettingsModel = Backbone.Model.extend({
    defaults: {
        theme: 'fb',
        expandGroups: true,
        listViewWidth: null,
        menuViewWidth: null,
        tagsViewHeight: null,
        autoUpdate: 'install',
        clipboardSeconds: 0,
        autoSave: true,
        rememberKeyFiles: false,
        idleMinutes: 15,
        minimizeOnClose: false,
        tableView: false,
        colorfulIcons: false,
        lockOnMinimize: true,
        lockOnCopy: false,
        helpTipCopyShown: false,
        skipOpenLocalWarn: false,
        hideEmptyFields: false,
        skipHttpsWarning: false,
        demoOpened: false,
        dropbox: true,
        webdav: true,
        gdrive: true,
        onedrive: true
    },

    initialize: function() {
        this.listenTo(this, 'change', this.save);
    },

    load: function() {
        var data = SettingsStore.load('app-settings');
        if (data) {
            this.set(data, {silent: true});
        }
    },

    save: function() {
        SettingsStore.save('app-settings', this.attributes);
    }
});

AppSettingsModel.instance = new AppSettingsModel();
AppSettingsModel.instance.load();

window.kwSettings = {
    get: function(key) { return AppSettingsModel.instance.get(key); },
    set: function(key, value) { AppSettingsModel.instance.set(key, value); }
};

module.exports = AppSettingsModel;
