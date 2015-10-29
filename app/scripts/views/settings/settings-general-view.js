'use strict';

var Backbone = require('backbone'),
    Launcher = require('../../comp/launcher'),
    Updater = require('../../comp/updater'),
    Format = require('../../util/format'),
    AppSettingsModel = require('../../models/app-settings-model'),
    UpdateModel = require('../../models/update-model'),
    RuntimeInfo = require('../../comp/runtime-info');

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

    initialize: function() {
        this.listenTo(UpdateModel.instance, 'change:status', this.render, this);
    },

    render: function() {
        this.renderTemplate({
            themes: this.allThemes,
            activeTheme: AppSettingsModel.instance.get('theme'),
            devTools: Launcher && Launcher.devTools,
            canAutoUpdate: !!Launcher,
            autoUpdate: Updater.enabledAutoUpdate(),
            updateInfo: this.getUpdateInfo()
        });
    },

    getUpdateInfo: function() {
        switch (UpdateModel.instance.get('updateStatus')) {
            case 'downloading':
                return 'Downloading update...';
            case 'downloaded':
                return 'Downloaded new version';
            case 'error':
                return 'Error downloading new version';
        }
        switch (UpdateModel.instance.get('status')) {
            case 'checking':
                return 'Checking for updates...';
            case 'error':
                var errMsg = 'Error checking for updates';
                if (UpdateModel.instance.get('lastError')) {
                    errMsg += ': ' + UpdateModel.instance.get('lastError');
                }
                if (UpdateModel.instance.get('lastSuccessCheckDate')) {
                    errMsg += '. Last successful check was at ' + Format.dtStr(UpdateModel.instance.get('lastSuccessCheckDate')) +
                        ': the latest version was ' + UpdateModel.instance.get('lastVersion');
                }
                return errMsg;
            case 'ok':
                var msg = 'Checked at ' + Format.dtStr(UpdateModel.instance.get('lastCheckDate')) + ': ';
                if (RuntimeInfo.version === UpdateModel.instance.get('lastVersion')) {
                    msg += 'you are using the latest version';
                } else {
                    msg += 'new version ' + UpdateModel.instance.get('lastVersion') + ' available, released at ' +
                        Format.dStr(UpdateModel.instance.get('lastVersionReleaseDate'));
                }
                return msg;
            default:
                return 'Never checked for updates';
        }
    },

    changeTheme: function(e) {
        var theme = e.target.value;
        AppSettingsModel.instance.set('theme', theme);
    },

    changeAutoUpdate: function(e) {
        var autoUpdate = e.target.checked;
        AppSettingsModel.instance.set('autoUpdate', autoUpdate);
        if (autoUpdate) {
            Updater.scheduleNextCheck();
        }
    },

    openDevTools: function() {
        if (Launcher) {
            Launcher.openDevTools();
        }
    }
});

module.exports = SettingsGeneralView;
