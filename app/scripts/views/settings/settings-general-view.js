'use strict';

var Backbone = require('backbone'),
    Launcher = require('../../comp/launcher'),
    Updater = require('../../comp/updater'),
    Format = require('../../util/format'),
    AppSettingsModel = require('../../models/app-settings-model'),
    UpdateModel = require('../../models/update-model'),
    RuntimeInfo = require('../../comp/runtime-info'),
    FeatureDetector = require('../../util/feature-detector'),
    Locale = require('../../util/locale'),
    Links = require('../../const/links');

var SettingsGeneralView = Backbone.View.extend({
    template: require('templates/settings/settings-general.hbs'),

    events: {
        'change .settings__general-theme': 'changeTheme',
        'change .settings__general-expand': 'changeExpandGroups',
        'change .settings__general-auto-update': 'changeAutoUpdate',
        'change .settings__general-idle-minutes': 'changeIdleMinutes',
        'change .settings__general-clipboard': 'changeClipboard',
        'change .settings__general-auto-save': 'changeAutoSave',
        'change .settings__general-minimize': 'changeMinimize',
        'change .settings__general-lock-on-minimize': 'changeLockOnMinimize',
        'change .settings__general-table-view': 'changeTableView',
        'change .settings__general-colorful-icons': 'changeColorfulIcons',
        'click .settings__general-update-btn': 'checkUpdate',
        'click .settings__general-restart-btn': 'restartApp',
        'click .settings__general-download-update-btn': 'downloadUpdate',
        'click .settings__general-update-found-btn': 'installFoundUpdate',
        'click .settings__general-dev-tools-link': 'openDevTools'
    },

    allThemes: {
        fb: 'Flat blue',
        db: 'Dark brown',
        wh: 'White'
    },

    initialize: function() {
        this.listenTo(UpdateModel.instance, 'change:status', this.render, this);
        this.listenTo(UpdateModel.instance, 'change:updateStatus', this.render, this);
    },

    render: function() {
        var updateReady = UpdateModel.instance.get('updateStatus') === 'ready',
            updateFound = UpdateModel.instance.get('updateStatus') === 'found',
            updateManual = UpdateModel.instance.get('updateManual');
        this.renderTemplate({
            themes: this.allThemes,
            activeTheme: AppSettingsModel.instance.get('theme'),
            expandGroups: AppSettingsModel.instance.get('expandGroups'),
            canClearClipboard: !!Launcher,
            clipboardSeconds: AppSettingsModel.instance.get('clipboardSeconds'),
            autoSave: AppSettingsModel.instance.get('autoSave'),
            idleMinutes: AppSettingsModel.instance.get('idleMinutes'),
            minimizeOnClose: AppSettingsModel.instance.get('minimizeOnClose'),
            devTools: Launcher && Launcher.devTools,
            canAutoUpdate: Updater.enabled,
            canMinimize: Launcher && Launcher.canMinimize(),
            lockOnMinimize: Launcher && AppSettingsModel.instance.get('lockOnMinimize'),
            tableView: AppSettingsModel.instance.get('tableView'),
            canSetTableView: FeatureDetector.isDesktop(),
            autoUpdate: Updater.getAutoUpdateType(),
            updateInProgress: Updater.updateInProgress(),
            updateInfo: this.getUpdateInfo(),
            updateWaitingReload: updateReady && !Launcher,
            showUpdateBlock: Updater.enabled && !updateManual,
            updateReady: updateReady,
            updateFound: updateFound,
            updateManual: updateManual,
            releaseNotesLink: Links.ReleaseNotes,
            colorfulIcons: AppSettingsModel.instance.get('colorfulIcons')
        });
    },

    getUpdateInfo: function() {
        switch (UpdateModel.instance.get('status')) {
            case 'checking':
                return Locale.setGenUpdateChecking + '...';
            case 'error':
                var errMsg = Locale.setGenErrorChecking;
                if (UpdateModel.instance.get('lastError')) {
                    errMsg += ': ' + UpdateModel.instance.get('lastError');
                }
                if (UpdateModel.instance.get('lastSuccessCheckDate')) {
                    errMsg += '. ' + Locale.setGenLastCheckSuccess.replace('{}', Format.dtStr(UpdateModel.instance.get('lastSuccessCheckDate'))) +
                        ': ' + Locale.setGenLastCheckVer.replace('{}', UpdateModel.instance.get('lastVersion'));
                }
                return errMsg;
            case 'ok':
                var msg = Locale.setGenCheckedAt + ' ' + Format.dtStr(UpdateModel.instance.get('lastCheckDate')) + ': ';
                var cmp = Updater.compareVersions(RuntimeInfo.version, UpdateModel.instance.get('lastVersion'));
                if (cmp >= 0) {
                    msg += Locale.setGenLatestVer;
                } else {
                    msg += Locale.setGenNewVer.replace('{}', UpdateModel.instance.get('lastVersion')) + ' ' +
                        Format.dStr(UpdateModel.instance.get('lastVersionReleaseDate'));
                }
                switch (UpdateModel.instance.get('updateStatus')) {
                    case 'downloading':
                        return msg + '. ' + Locale.setGenDownloadingUpdate;
                    case 'extracting':
                        return msg + '. ' + Locale.setGenExtractingUpdate;
                    case 'error':
                        return msg + '. ' + Locale.setGenCheckErr;
                }
                return msg;
            default:
                return Locale.setGenNeverChecked;
        }
    },

    changeTheme: function(e) {
        var theme = e.target.value;
        AppSettingsModel.instance.set('theme', theme);
    },

    changeClipboard: function(e) {
        var clipboardSeconds = +e.target.value;
        AppSettingsModel.instance.set('clipboardSeconds', clipboardSeconds);
    },

    changeIdleMinutes: function(e) {
        var idleMinutes = +e.target.value;
        AppSettingsModel.instance.set('idleMinutes', idleMinutes);
    },

    changeAutoUpdate: function(e) {
        var autoUpdate = e.target.value || false;
        AppSettingsModel.instance.set('autoUpdate', autoUpdate);
        if (autoUpdate) {
            Updater.scheduleNextCheck();
        }
    },

    checkUpdate: function() {
        Updater.check(true);
    },

    changeAutoSave: function(e) {
        var autoSave = e.target.checked || false;
        AppSettingsModel.instance.set('autoSave', autoSave);
    },

    changeMinimize: function(e) {
        var minimizeOnClose = e.target.checked || false;
        AppSettingsModel.instance.set('minimizeOnClose', minimizeOnClose);
    },

    changeLockOnMinimize: function(e) {
        var lockOnMinimize = e.target.checked || false;
        AppSettingsModel.instance.set('lockOnMinimize', lockOnMinimize);
    },

    changeTableView: function(e) {
        var tableView = e.target.checked || false;
        AppSettingsModel.instance.set('tableView', tableView);
        Backbone.trigger('refresh');
    },

    changeColorfulIcons: function(e) {
        var colorfulIcons = e.target.checked || false;
        AppSettingsModel.instance.set('colorfulIcons', colorfulIcons);
        Backbone.trigger('refresh');
    },

    restartApp: function() {
        if (Launcher) {
            Launcher.requestRestart();
        } else {
            window.location.reload();
        }
    },

    downloadUpdate: function() {
        Launcher.openLink(Links.Desktop);
    },

    installFoundUpdate: function() {
        Updater.update(true, function() {
            Launcher.requestRestart();
        });
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
