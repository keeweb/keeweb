const Backbone = require('backbone');
const SettingsPrvView = require('./settings-prv-view');
const SettingsLogsView = require('./settings-logs-view');
const Launcher = require('../../comp/launcher');
const Updater = require('../../comp/updater');
const Format = require('../../util/format');
const AppSettingsModel = require('../../models/app-settings-model');
const UpdateModel = require('../../models/update-model');
const RuntimeInfo = require('../../comp/runtime-info');
const Alerts = require('../../comp/alerts');
const SettingsManager = require('../../comp/settings-manager');
const Storage = require('../../storage');
const FeatureDetector = require('../../util/feature-detector');
const Locale = require('../../util/locale');
const SemVer = require('../../util/semver');
const Links = require('../../const/links');
const AutoType = require('../../auto-type');

const SettingsGeneralView = Backbone.View.extend({
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
        'change .settings__general-auto-save-interval': 'changeAutoSaveInterval',
        'change .settings__general-remember-key-files': 'changeRememberKeyFiles',
        'change .settings__general-minimize': 'changeMinimize',
        'change .settings__general-lock-on-minimize': 'changeLockOnMinimize',
        'change .settings__general-lock-on-copy': 'changeLockOnCopy',
        'change .settings__general-lock-on-auto-type': 'changeLockOnAutoType',
        'change .settings__general-lock-on-os-lock': 'changeLockOnOsLock',
        'change .settings__general-table-view': 'changeTableView',
        'change .settings__general-colorful-icons': 'changeColorfulIcons',
        'change .settings__general-titlebar-style': 'changeTitlebarStyle',
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

    initialize: function() {
        this.views = {};
        this.listenTo(UpdateModel.instance, 'change:status', this.render, this);
        this.listenTo(UpdateModel.instance, 'change:updateStatus', this.render, this);
    },

    render: function() {
        const updateReady = UpdateModel.instance.get('updateStatus') === 'ready';
        const updateFound = UpdateModel.instance.get('updateStatus') === 'found';
        const updateManual = UpdateModel.instance.get('updateManual');
        const storageProviders = this.getStorageProviders();

        this.renderTemplate({
            themes: _.mapObject(SettingsManager.allThemes, theme => Locale[theme]),
            activeTheme: AppSettingsModel.instance.get('theme'),
            locales: SettingsManager.allLocales,
            activeLocale: SettingsManager.activeLocale,
            fontSize: AppSettingsModel.instance.get('fontSize'),
            expandGroups: AppSettingsModel.instance.get('expandGroups'),
            canClearClipboard: !!Launcher,
            clipboardSeconds: AppSettingsModel.instance.get('clipboardSeconds'),
            rememberKeyFiles: AppSettingsModel.instance.get('rememberKeyFiles'),
            supportFiles: !!Launcher,
            autoSave: AppSettingsModel.instance.get('autoSave'),
            autoSaveInterval: AppSettingsModel.instance.get('autoSaveInterval'),
            idleMinutes: AppSettingsModel.instance.get('idleMinutes'),
            minimizeOnClose: AppSettingsModel.instance.get('minimizeOnClose'),
            devTools: Launcher && Launcher.devTools,
            canAutoUpdate: Updater.enabled,
            canAutoSaveOnClose: !!Launcher,
            canMinimize: Launcher && Launcher.canMinimize(),
            canDetectMinimize: !!Launcher,
            canDetectOsSleep: Launcher && Launcher.canDetectOsSleep(),
            canAutoType: AutoType.enabled,
            lockOnMinimize: Launcher && AppSettingsModel.instance.get('lockOnMinimize'),
            lockOnCopy: AppSettingsModel.instance.get('lockOnCopy'),
            lockOnAutoType: AppSettingsModel.instance.get('lockOnAutoType'),
            lockOnOsLock: AppSettingsModel.instance.get('lockOnOsLock'),
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
            supportsTitleBarStyles: Launcher && FeatureDetector.supportsTitleBarStyles(),
            titlebarStyle: AppSettingsModel.instance.get('titlebarStyle'),
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
                let errMsg = Locale.setGenErrorChecking;
                if (UpdateModel.instance.get('lastError')) {
                    errMsg += ': ' + UpdateModel.instance.get('lastError');
                }
                if (UpdateModel.instance.get('lastSuccessCheckDate')) {
                    errMsg += '. ' + Locale.setGenLastCheckSuccess.replace('{}', Format.dtStr(UpdateModel.instance.get('lastSuccessCheckDate'))) +
                        ': ' + Locale.setGenLastCheckVer.replace('{}', UpdateModel.instance.get('lastVersion'));
                }
                return errMsg;
            case 'ok':
                let msg = Locale.setGenCheckedAt + ' ' + Format.dtStr(UpdateModel.instance.get('lastCheckDate')) + ': ';
                const cmp = SemVer.compareVersions(RuntimeInfo.version, UpdateModel.instance.get('lastVersion'));
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
        const storageProviders = [];
        Object.keys(Storage).forEach(name => {
            const prv = Storage[name];
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
        const theme = e.target.value;
        AppSettingsModel.instance.set('theme', theme);
    },

    changeLocale: function(e) {
        const locale = e.target.value;
        if (locale === '...') {
            e.target.value = AppSettingsModel.instance.get('locale') || 'en';
            this.appModel.menu.select({ item: this.appModel.menu.pluginsSection.get('items').first() });
            return;
        }
        AppSettingsModel.instance.set('locale', locale);
    },

    changeFontSize: function(e) {
        const fontSize = +e.target.value;
        AppSettingsModel.instance.set('fontSize', fontSize);
    },

    changeTitlebarStyle: function(e) {
        const titlebarStyle = e.target.value;
        AppSettingsModel.instance.set('titlebarStyle', titlebarStyle);
    },

    changeClipboard: function(e) {
        const clipboardSeconds = +e.target.value;
        AppSettingsModel.instance.set('clipboardSeconds', clipboardSeconds);
    },

    changeIdleMinutes: function(e) {
        const idleMinutes = +e.target.value;
        AppSettingsModel.instance.set('idleMinutes', idleMinutes);
    },

    changeAutoUpdate: function(e) {
        const autoUpdate = e.target.value || false;
        AppSettingsModel.instance.set('autoUpdate', autoUpdate);
        if (autoUpdate) {
            Updater.scheduleNextCheck();
        }
    },

    checkUpdate: function() {
        Updater.check(true);
    },

    changeAutoSave: function(e) {
        const autoSave = e.target.checked || false;
        AppSettingsModel.instance.set('autoSave', autoSave);
    },

    changeAutoSaveInterval: function(e) {
        const autoSaveInterval = Number(e.target.value) || 0;
        AppSettingsModel.instance.set('autoSaveInterval', autoSaveInterval);
    },

    changeRememberKeyFiles: function(e) {
        const rememberKeyFiles = e.target.value || false;
        AppSettingsModel.instance.set('rememberKeyFiles', rememberKeyFiles);
        this.appModel.clearStoredKeyFiles();
    },

    changeMinimize: function(e) {
        const minimizeOnClose = e.target.checked || false;
        AppSettingsModel.instance.set('minimizeOnClose', minimizeOnClose);
    },

    changeLockOnMinimize: function(e) {
        const lockOnMinimize = e.target.checked || false;
        AppSettingsModel.instance.set('lockOnMinimize', lockOnMinimize);
    },

    changeLockOnCopy: function(e) {
        const lockOnCopy = e.target.checked || false;
        AppSettingsModel.instance.set('lockOnCopy', lockOnCopy);
    },

    changeLockOnAutoType: function(e) {
        const lockOnAutoType = e.target.checked || false;
        AppSettingsModel.instance.set('lockOnAutoType', lockOnAutoType);
    },

    changeLockOnOsLock: function(e) {
        const lockOnOsLock = e.target.checked || false;
        AppSettingsModel.instance.set('lockOnOsLock', lockOnOsLock);
    },

    changeTableView: function(e) {
        const tableView = e.target.checked || false;
        AppSettingsModel.instance.set('tableView', tableView);
        Backbone.trigger('refresh');
    },

    changeColorfulIcons: function(e) {
        const colorfulIcons = e.target.checked || false;
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
        const expand = e.target.checked;
        AppSettingsModel.instance.set('expandGroups', expand);
        Backbone.trigger('refresh');
    },

    changeStorageEnabled: function(e) {
        const storage = Storage[$(e.target).data('storage')];
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
