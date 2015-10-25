'use strict';

var Backbone = require('backbone'),
    Launcher = require('../../comp/launcher'),
    AppSettingsModel = require('../../models/app-settings-model');

var SettingsGeneralView = Backbone.View.extend({
    template: require('templates/settings/settings-general.html'),

    events: {
        'change .settings__general-theme': 'changeTheme',
        'click .settings__general-dev-tools-link': 'openDevTools'
    },

    allThemes: {
        d: 'default',
        fb: 'flat blue',
        wh: 'white'
    },

    render: function() {
        var activeTheme = AppSettingsModel.instance.get('theme');
        this.renderTemplate({
            themes: this.allThemes,
            activeTheme: activeTheme,
            devTools: Launcher && Launcher.devTools
        });
    },

    changeTheme: function(e) {
        var theme = e.target.value;
        AppSettingsModel.instance.set('theme', theme);
    },

    openDevTools: function() {
        if (Launcher) {
            Launcher.openDevTools();
        }
    }
});

module.exports = SettingsGeneralView;
