'use strict';

var Backbone = require('backbone'),
    Launcher = require('../../comp/launcher'),
    Updater = require('../../comp/updater'),
    Format = require('../../util/format'),
    AppSettingsModel = require('../../models/app-settings-model');

var SettingsGeneralView = Backbone.View.extend({
    template: require('templates/settings/settings-general.html'),

    events: {
        'change #settings__general-theme': 'changeTheme',
        'change #settings__general-auto-update': 'changeAutoUpdate',
        'click .settings__general-dev-tools-link': 'openDevTools'
    },

    allThemes: {
        d: 'default',
        fb: 'flat blue',
        wh: 'white'
    },

    render: function() {
        var lastUpdateCheck;
        switch (Updater.status) {
            case 'checking':
                lastUpdateCheck = 'Checking...';
                break;
            case 'err':
                lastUpdateCheck = 'Error checking';
                break;
            case 'ok':
                lastUpdateCheck = Format.dtStr(Updater.lastCheckDate) + ': ' +
                    (Updater.needUpdate ? 'New version available: ' + Updater.lastVersion +
                        ' (released ' + Format.dStr(Updater.lastVersionReleaseDate) + ')'
                        : 'You are using the latest version');
                break;
            default:
                lastUpdateCheck = 'Never';
                break;
        }
        this.renderTemplate({
            themes: this.allThemes,
            activeTheme: AppSettingsModel.instance.get('theme'),
            autoUpdate: AppSettingsModel.instance.get('autoUpdate'),
            canAutoUpdate: !!Launcher,
            lastUpdateCheck: lastUpdateCheck,
            devTools: Launcher && Launcher.devTools
        });
    },

    changeTheme: function(e) {
        var theme = e.target.value;
        AppSettingsModel.instance.set('theme', theme);
    },

    changeAutoUpdate: function(e) {
        var autoUpdate = e.target.checked;
        AppSettingsModel.instance.set('autoUpdate', autoUpdate);
        if (autoUpdate) {
            Updater.check();
        }
    },

    openDevTools: function() {
        if (Launcher) {
            Launcher.openDevTools();
        }
    }
});

module.exports = SettingsGeneralView;
