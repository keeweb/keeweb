'use strict';

var Backbone = require('backbone'),
    SettingsPrvView = require('./settings-prv-view'),
    SettingsLogsView = require('./settings-logs-view'),
    Launcher = require('../../comp/launcher'),
    Updater = require('../../comp/updater'),
    Format = require('../../util/format'),
    AppSettingsModel = require('../../models/app-settings-model'),
    UpdateModel = require('../../models/update-model'),
    RuntimeInfo = require('../../comp/runtime-info'),
    Alerts = require('../../comp/alerts'),
    Storage = require('../../storage'),
    FeatureDetector = require('../../util/feature-detector'),
    Locale = require('../../util/locale'),
    Links = require('../../const/links');

var SettingsGeneralView = Backbone.View.extend({
    template: require('templates/settings/settings-general.hbs'),

    events: {
        'change .settings__general-theme': 'changeTheme',
        'change .settings__general-locale': 'changeLocale',
        'change .settings__general-font-size': 'changeFontSize',
        'change .settings__general-expand': 'changeExpandGroups',
        'change .settings__general-auto-update': 'changeAutoUpdate',
        'change .settings__general-idle-minutes': 'changeIdleMinutes',
        'change .settings__general-clipboard': 'changeClipboard',
        'change .settings__general-auto-save': 'changeAutoSave',
        'change .settings__general-remember-key-files': 'changeRememberKeyFiles',
        'change .settings__general-minimize': 'changeMinimize',
        'change .settings__general-lock-on-minimize': 'changeLockOnMinimize',
        'change .settings__general-lock-on-copy': 'changeLockOnCopy',
        'change .settings__general-table-view': 'changeTableView',
        'change .settings__general-colorful-icons': 'changeColorfulIcons',
        'click .settings__general-update-btn': 'checkUpdate',
        'click .settings__general-restart-btn': 'restartApp',
        'click .settings__general-download-update-btn': 'downloadUpdate',
        'click .settings__general-update-found-btn': 'installFoundUpdate',
        'change .settings__general-prv-check': 'changeStorageEnabled',
        'click .settings__general-show-advanced': 'showAdvancedSettings',
        'click .settings__general-dev-tools-link': 'openDevTools',
        'click .settings__general-try-beta-link': 'tryBeta',
        'click .settings__general-show-logs-link': 'showLogs'
    },

    views: null,

    allThemes: {
        fb: Locale.setGenThemeFb,
        db: Locale.setGenThemeDb,
        sd: Locale.setGenThemeSd,
        sl: Locale.setGenThemeSl,
        wh: Locale.setGenThemeWh,
        hc: Locale.setGenThemeHc
    },

    allLocales: {
        en: 'English',
        'de-DE': 'Deutsch'
    },

    initialize: function() {
        this.views = {};
        this.listenTo(UpdateModel.instance, 'change:status', this.render, this);
        this.listenTo(UpdateModel.instance, 'change:updateStatus', this.render, this);
    },

    render: function() {
        var updateReady = UpdateModel.instance.get('updateStatus') === 'ready',
            updateFound = UpdateModel.instance.get('updateStatus') === 'found',
            updateManual = UpdateModel.instance.get('updateManual'),
            storageProviders = this.getStorageProviders();
        this.renderTemplate({
            themes: this.allThemes,
            activeTheme: AppSettingsModel.instance.get('theme'),
            locales: this.allLocales,
            activeLocale: AppSettingsModel.instance.get('locale') || 'en',
            fontSize: AppSettingsModel.instance.get('fontSize'),
            expandGroups: AppSettingsModel.instance.get('expandGroups'),
            canClearClipboard: !!Launcher,
            clipboardSeconds: AppSettingsModel.instance.get('clipboardSeconds'),
            rememberKeyFiles: AppSettingsModel.instance.get('rememberKeyFiles'),
            autoSave: AppSettingsModel.instance.get('autoSave'),
            idleMinutes: AppSettingsModel.instance.get('idleMinutes'),
            minimizeOnClose: AppSettingsModel.instance.get('minimizeOnClose'),
            devTools: Launcher && Launcher.devTools,
            canAutoUpdate: Updater.enabled,
            canMinimize: Launcher && Launcher.canMinimize(),
            canDetectMinimize: !!Launcher,
            lockOnMinimize: Launcher && AppSettingsModel.instance.get('lockOnMinimize'),
            lockOnCopy: AppSettingsModel.instance.get('lockOnCopy'),
            tableView: AppSettingsModel.instance.get('tableView'),
            canSetTableView: !FeatureDetector.isMobile,
            autoUpdate: Updater.getAutoUpdateType(),
            updateInProgress: Updater.updateInProgress(),
            updateInfo: this.getUpdateInfo(),
            updateWaitingReload: updateReady && !Launcher,
            showUpdateBlock: Updater.enabled && !updateManual,
            updateReady: updateReady,
            updateFound: updateFound,
            updateManual: updateManual,
            releaseNotesLink: Links.ReleaseNotes,
            colorfulIcons: AppSettingsModel.instance.get('colorfulIcons'),
            storageProviders: storageProviders
        });
        this.renderProviderViews(storageProviders);
    },

    renderProviderViews: function(storageProviders) {
        storageProviders.forEach(function(prv) {
            if (this.views[prv.name]) {
                this.views[prv.name].remove();
            }
            if (prv.hasConfig) {
                this.views[prv.name] = new SettingsPrvView({
                    el: this.$el.find('.settings__general-' + prv.name),
                    model: prv
                }).render();
            }
        }, this);
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

    getStorageProviders: function() {
        var storageProviders = [];
        Object.keys(Storage).forEach(name => {
            var prv = Storage[name];
            if (!prv.system) {
                storageProviders.push(prv);
            }
        });
        storageProviders.sort((x, y) => (x.uipos || Infinity) - (y.uipos || Infinity));
        return storageProviders.map(sp => ({
            name: sp.name,
            enabled: sp.enabled,
            hasConfig: sp.getSettingsConfig
        }));
    },

    changeTheme: function(e) {
        var theme = e.target.value;
        AppSettingsModel.instance.set('theme', theme);
    },

    changeLocale: function(e) {
        var locale = e.target.value;
        if (locale === 'en') {
            locale = null;
        }
        if (locale === '...') {
            e.target.value = AppSettingsModel.instance.get('locale') || 'en';
            Alerts.info({
                icon: 'language',
                header: Locale.setGenLocMsg,
                body: Locale.setGenLocMsgBody + ` <a target="_blank" href="${Links.Translation}">${Locale.setGenLocMsgLink}</a>`
            });
            return;
        }
        AppSettingsModel.instance.set('locale', locale);
    },

    changeFontSize: function(e) {
        var fontSize = +e.target.value;
        AppSettingsModel.instance.set('fontSize', fontSize);
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

    changeRememberKeyFiles: function(e) {
        var rememberKeyFiles = e.target.checked || false;
        AppSettingsModel.instance.set('rememberKeyFiles', rememberKeyFiles);
        if (!rememberKeyFiles) {
            this.appModel.clearStoredKeyFiles();
        }
    },

    changeMinimize: function(e) {
        var minimizeOnClose = e.target.checked || false;
        AppSettingsModel.instance.set('minimizeOnClose', minimizeOnClose);
    },

    changeLockOnMinimize: function(e) {
        var lockOnMinimize = e.target.checked || false;
        AppSettingsModel.instance.set('lockOnMinimize', lockOnMinimize);
    },

    changeLockOnCopy: function(e) {
        var lockOnCopy = e.target.checked || false;
        AppSettingsModel.instance.set('lockOnCopy', lockOnCopy);
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
        Updater.update(true, () => {
            Launcher.requestRestart();
        });
    },

    changeExpandGroups: function(e) {
        var expand = e.target.checked;
        AppSettingsModel.instance.set('expandGroups', expand);
        Backbone.trigger('refresh');
    },

    changeStorageEnabled: function(e) {
        var storage = Storage[$(e.target).data('storage')];
        if (storage) {
            storage.setEnabled(e.target.checked);
            AppSettingsModel.instance.set(storage.name, storage.enabled);
            this.$el.find('.settings__general-' + storage.name).toggleClass('hide', !e.target.checked);
        }
    },

    showAdvancedSettings: function() {
        this.$el.find('.settings__general-show-advanced, .settings__general-advanced').toggleClass('hide');
        this.scrollToBottom();
    },

    openDevTools: function() {
        if (Launcher) {
            Launcher.openDevTools();
        }
    },

    tryBeta: function() {
        if (this.appModel.files.hasUnsavedFiles()) {
            Alerts.info({
                header: Locale.setGenTryBetaWarning,
                body: Locale.setGenTryBetaWarningBody
            });
        } else {
            location.href = Links.BetaWebApp;
        }
    },

    showLogs: function() {
        if (this.views.logView) {
            this.views.logView.remove();
        }
        this.views.logView = new SettingsLogsView({ el: this.$el.find('.settings__general-advanced') }).render();
        this.scrollToBottom();
    },

    scrollToBottom: function() {
        this.$el.closest('.scroller').scrollTop(this.$el.height());
    }
});

module.exports = SettingsGeneralView;
