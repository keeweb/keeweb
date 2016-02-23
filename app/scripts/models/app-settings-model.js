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
        idleMinutes: 15,
        minimizeOnClose: false,
        tableView: false,
        colorfulIcons: false,
        lockOnMinimize: true,
        helpTipCopyShown: false,
        skipOpenLocalWarn: false
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

module.exports = AppSettingsModel;
