'use strict';

var Backbone = require('backbone'),
    Launcher = require('../../comp/launcher'),
    AppSettingsModel = require('../../models/app-settings-model');

var SettingsGeneralView = Backbone.View.extend({
    template: require('templates/settings/settings-general.html'),

    events: {
        'change .settings__general-theme': 'changeTheme',
        'change .settings__general-expand': 'changeExpandGroups',
        'click .settings__general-dev-tools-link': 'openDevTools'
    },

    allThemes: {
        d: 'default',
        fb: 'flat blue',
        wh: 'white'
    },

    render: function() {
        this.renderTemplate({
            themes: this.allThemes,
            activeTheme: AppSettingsModel.instance.get('theme'),
            expandGroups: AppSettingsModel.instance.get('expandGroups'),
            devTools: Launcher && Launcher.devTools
        });
    },

    changeTheme: function(e) {
        var theme = e.target.value;
        AppSettingsModel.instance.set('theme', theme);
    },

    changeExpandGroups: function(e) {
        var expand = e.target.checked;
        AppSettingsModel.instance.set('expandGroups', expand);
        Backbone.trigger('refresh');
    },

    openDevTools: function() {
        if (Launcher) {
            Launcher.openDevTools();
        }
    }
});

module.exports = SettingsGeneralView;
