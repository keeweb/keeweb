import { Events } from 'framework/events';
import { View } from 'framework/views/view';
import { AutoType } from 'auto-type';
import { Storage } from 'storage';
import { RuntimeInfo } from 'const/runtime-info';
import { Updater } from 'comp/app/updater';
import { Launcher } from 'comp/launcher';
import { SettingsManager } from 'comp/settings/settings-manager';
import { Alerts } from 'comp/ui/alerts';
import { Links } from 'const/links';
import { AppSettingsModel } from 'models/app-settings-model';
import { UpdateModel } from 'models/update-model';
import { SemVer } from 'util/data/semver';
import { Features } from 'util/features';
import { DateFormat } from 'util/formatting/date-format';
import { Locale } from 'util/locale';
import { SettingsLogsView } from 'views/settings/settings-logs-view';
import { SettingsPrvView } from 'views/settings/settings-prv-view';
import { mapObject } from 'util/fn';
import template from 'templates/settings/settings-general.hbs';

class SettingsGeneralView extends View {
    template = template;

    events = {
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
        'change .settings__general-use-markdown': 'changeUseMarkdown',
        'change .settings__general-use-group-icon-for-entries': 'changeUseGroupIconForEntries',
        'change .settings__general-direct-autotype': 'changeDirectAutotype',
        'change .settings__general-field-label-dblclick-autotype':
            'changeFieldLabelDblClickAutoType',
        'change .settings__general-titlebar-style': 'changeTitlebarStyle',
        'click .settings__general-update-btn': 'checkUpdate',
        'click .settings__general-restart-btn': 'restartApp',
        'click .settings__general-download-update-btn': 'downloadUpdate',
        'click .settings__general-update-found-btn': 'installFoundUpdate',
        'change .settings__general-prv-check': 'changeStorageEnabled',
        'click .settings__general-prv-logout': 'logoutFromStorage',
        'click .settings__general-show-advanced': 'showAdvancedSettings',
        'click .settings__general-dev-tools-link': 'openDevTools',
        'click .settings__general-try-beta-link': 'tryBeta',
        'click .settings__general-show-logs-link': 'showLogs',
        'click .settings__general-reload-app-link': 'reloadApp'
    };

    constructor(model, options) {
        super(model, options);
        this.listenTo(UpdateModel, 'change:status', this.render);
        this.listenTo(UpdateModel, 'change:updateStatus', this.render);
    }

    render() {
        const updateReady = UpdateModel.updateStatus === 'ready';
        const updateFound = UpdateModel.updateStatus === 'found';
        const updateManual = UpdateModel.updateManual;
        const storageProviders = this.getStorageProviders();

        super.render({
            themes: mapObject(SettingsManager.allThemes, (theme) => Locale[theme]),
            activeTheme: SettingsManager.activeTheme,
            locales: SettingsManager.allLocales,
            activeLocale: SettingsManager.activeLocale,
            fontSize: AppSettingsModel.fontSize,
            expandGroups: AppSettingsModel.expandGroups,
            canClearClipboard: !!Launcher,
            clipboardSeconds: AppSettingsModel.clipboardSeconds,
            rememberKeyFiles: AppSettingsModel.rememberKeyFiles,
            supportFiles: !!Launcher,
            autoSave: AppSettingsModel.autoSave,
            autoSaveInterval: AppSettingsModel.autoSaveInterval,
            idleMinutes: AppSettingsModel.idleMinutes,
            minimizeOnClose: AppSettingsModel.minimizeOnClose,
            devTools: Launcher && Launcher.devTools,
            canAutoUpdate: Updater.enabled,
            canAutoSaveOnClose: !!Launcher,
            canMinimize: !!Launcher,
            canDetectMinimize: !!Launcher,
            canDetectOsSleep: Launcher && Launcher.canDetectOsSleep(),
            canAutoType: AutoType.enabled,
            lockOnMinimize: Launcher && AppSettingsModel.lockOnMinimize,
            lockOnCopy: AppSettingsModel.lockOnCopy,
            lockOnAutoType: AppSettingsModel.lockOnAutoType,
            lockOnOsLock: AppSettingsModel.lockOnOsLock,
            tableView: AppSettingsModel.tableView,
            canSetTableView: !Features.isMobile,
            autoUpdate: Updater.getAutoUpdateType(),
            updateInProgress: Updater.updateInProgress(),
            updateInfo: this.getUpdateInfo(),
            updateWaitingReload: updateReady && !Launcher,
            showUpdateBlock: Updater.enabled && !updateManual,
            updateReady,
            updateFound,
            updateManual,
            releaseNotesLink: Links.ReleaseNotes,
            colorfulIcons: AppSettingsModel.colorfulIcons,
            useMarkdown: AppSettingsModel.useMarkdown,
            useGroupIconForEntries: AppSettingsModel.useGroupIconForEntries,
            directAutotype: AppSettingsModel.directAutotype,
            fieldLabelDblClickAutoType: AppSettingsModel.fieldLabelDblClickAutoType,
            supportsTitleBarStyles: Launcher && Features.supportsTitleBarStyles(),
            titlebarStyle: AppSettingsModel.titlebarStyle,
            storageProviders,
            showReloadApp: Features.isStandalone
        });
        this.renderProviderViews(storageProviders);
    }

    renderProviderViews(storageProviders) {
        storageProviders.forEach(function (prv) {
            if (this.views[prv.name]) {
                this.views[prv.name].remove();
            }
            if (prv.hasConfig) {
                const prvView = new SettingsPrvView(prv, {
                    parent: this.$el.find('.settings__general-' + prv.name)[0]
                });
                this.views[prv.name] = prvView;
                prvView.render();
            }
        }, this);
    }

    getUpdateInfo() {
        switch (UpdateModel.status) {
            case 'checking':
                return Locale.setGenUpdateChecking + '...';
            case 'error': {
                let errMsg = Locale.setGenErrorChecking;
                if (UpdateModel.lastError) {
                    errMsg += ': ' + UpdateModel.lastError;
                }
                if (UpdateModel.lastSuccessCheckDate) {
                    errMsg +=
                        '. ' +
                        Locale.setGenLastCheckSuccess.replace(
                            '{}',
                            DateFormat.dtStr(UpdateModel.lastSuccessCheckDate)
                        ) +
                        ': ' +
                        Locale.setGenLastCheckVer.replace('{}', UpdateModel.lastVersion);
                }
                return errMsg;
            }
            case 'ok': {
                let msg =
                    Locale.setGenCheckedAt +
                    ' ' +
                    DateFormat.dtStr(UpdateModel.lastCheckDate) +
                    ': ';
                const cmp = SemVer.compareVersions(RuntimeInfo.version, UpdateModel.lastVersion);
                if (cmp >= 0) {
                    msg += Locale.setGenLatestVer;
                } else {
                    msg +=
                        Locale.setGenNewVer.replace('{}', UpdateModel.lastVersion) +
                        ' ' +
                        DateFormat.dStr(UpdateModel.lastVersionReleaseDate);
                }
                switch (UpdateModel.updateStatus) {
                    case 'downloading':
                        return msg + '. ' + Locale.setGenDownloadingUpdate;
                    case 'extracting':
                        return msg + '. ' + Locale.setGenExtractingUpdate;
                    case 'error':
                        return msg + '. ' + Locale.setGenCheckErr;
                }
                return msg;
            }
            default:
                return Locale.setGenNeverChecked;
        }
    }

    getStorageProviders() {
        const storageProviders = [];
        Object.keys(Storage).forEach((name) => {
            const prv = Storage[name];
            if (!prv.system) {
                storageProviders.push(prv);
            }
        });
        storageProviders.sort((x, y) => (x.uipos || Infinity) - (y.uipos || Infinity));
        return storageProviders.map((sp) => ({
            name: sp.name,
            enabled: sp.enabled,
            hasConfig: !!sp.getSettingsConfig,
            loggedIn: sp.loggedIn
        }));
    }

    changeTheme(e) {
        const theme = e.target.value;
        AppSettingsModel.theme = theme;
    }

    changeLocale(e) {
        const locale = e.target.value;
        if (locale === '...') {
            e.target.value = AppSettingsModel.locale || 'en';
            this.appModel.menu.select({
                item: this.appModel.menu.pluginsSection.items[0]
            });
            return;
        }
        AppSettingsModel.locale = locale;
    }

    changeFontSize(e) {
        const fontSize = +e.target.value;
        AppSettingsModel.fontSize = fontSize;
    }

    changeTitlebarStyle(e) {
        const titlebarStyle = e.target.value;
        AppSettingsModel.titlebarStyle = titlebarStyle;
    }

    changeClipboard(e) {
        const clipboardSeconds = +e.target.value;
        AppSettingsModel.clipboardSeconds = clipboardSeconds;
    }

    changeIdleMinutes(e) {
        const idleMinutes = +e.target.value;
        AppSettingsModel.idleMinutes = idleMinutes;
    }

    changeAutoUpdate(e) {
        const autoUpdate = e.target.value || false;
        AppSettingsModel.autoUpdate = autoUpdate;
        if (autoUpdate) {
            Updater.scheduleNextCheck();
        }
    }

    checkUpdate() {
        Updater.check(true);
    }

    changeAutoSave(e) {
        const autoSave = e.target.checked || false;
        AppSettingsModel.autoSave = autoSave;
    }

    changeAutoSaveInterval(e) {
        const autoSaveInterval = Number(e.target.value) || 0;
        AppSettingsModel.autoSaveInterval = autoSaveInterval;
    }

    changeRememberKeyFiles(e) {
        const rememberKeyFiles = e.target.value || false;
        AppSettingsModel.rememberKeyFiles = rememberKeyFiles;
        this.appModel.clearStoredKeyFiles();
    }

    changeMinimize(e) {
        const minimizeOnClose = e.target.checked || false;
        AppSettingsModel.minimizeOnClose = minimizeOnClose;
    }

    changeLockOnMinimize(e) {
        const lockOnMinimize = e.target.checked || false;
        AppSettingsModel.lockOnMinimize = lockOnMinimize;
    }

    changeLockOnCopy(e) {
        const lockOnCopy = e.target.checked || false;
        AppSettingsModel.lockOnCopy = lockOnCopy;
    }

    changeLockOnAutoType(e) {
        const lockOnAutoType = e.target.checked || false;
        AppSettingsModel.lockOnAutoType = lockOnAutoType;
    }

    changeLockOnOsLock(e) {
        const lockOnOsLock = e.target.checked || false;
        AppSettingsModel.lockOnOsLock = lockOnOsLock;
    }

    changeTableView(e) {
        const tableView = e.target.checked || false;
        AppSettingsModel.tableView = tableView;
        Events.emit('refresh');
    }

    changeColorfulIcons(e) {
        const colorfulIcons = e.target.checked || false;
        AppSettingsModel.colorfulIcons = colorfulIcons;
        Events.emit('refresh');
    }

    changeUseMarkdown(e) {
        const useMarkdown = e.target.checked || false;
        AppSettingsModel.useMarkdown = useMarkdown;
        Events.emit('refresh');
    }

    changeUseGroupIconForEntries(e) {
        const useGroupIconForEntries = e.target.checked || false;
        AppSettingsModel.useGroupIconForEntries = useGroupIconForEntries;
        Events.emit('refresh');
    }

    changeDirectAutotype(e) {
        const directAutotype = e.target.checked || false;
        AppSettingsModel.directAutotype = directAutotype;
        Events.emit('refresh');
    }

    changeFieldLabelDblClickAutoType(e) {
        const fieldLabelDblClickAutoType = e.target.checked || false;
        AppSettingsModel.fieldLabelDblClickAutoType = fieldLabelDblClickAutoType;
        Events.emit('refresh');
    }

    restartApp() {
        if (Launcher) {
            Launcher.requestRestart();
        } else {
            window.location.reload();
        }
    }

    downloadUpdate() {
        Launcher.openLink(Links.Desktop);
    }

    installFoundUpdate() {
        Updater.update(true, () => {
            Launcher.requestRestart();
        });
    }

    changeExpandGroups(e) {
        const expand = e.target.checked;
        AppSettingsModel.expandGroups = expand;
        Events.emit('refresh');
    }

    changeStorageEnabled(e) {
        const storage = Storage[$(e.target).data('storage')];
        if (storage) {
            storage.setEnabled(e.target.checked);
            AppSettingsModel[storage.name] = storage.enabled;
            this.$el
                .find('.settings__general-' + storage.name)
                .toggleClass('hide', !e.target.checked);
        }
    }

    logoutFromStorage(e) {
        const storage = Storage[$(e.target).data('storage')];
        if (storage) {
            storage.logout();
            $(e.target).remove();
        }
    }

    showAdvancedSettings() {
        this.$el
            .find('.settings__general-show-advanced, .settings__general-advanced')
            .toggleClass('hide');
        this.scrollToBottom();
    }

    openDevTools() {
        if (Launcher) {
            Launcher.openDevTools();
        }
    }

    tryBeta() {
        if (this.appModel.files.hasUnsavedFiles()) {
            Alerts.info({
                header: Locale.setGenTryBetaWarning,
                body: Locale.setGenTryBetaWarningBody
            });
        } else {
            location.href = Links.BetaWebApp;
        }
    }

    showLogs() {
        if (this.views.logView) {
            this.views.logView.remove();
        }
        this.views.logView = new SettingsLogsView();
        this.views.logView.render();
        this.scrollToBottom();
    }

    reloadApp() {
        location.reload();
    }

    scrollToBottom() {
        this.$el.closest('.scroller').scrollTop(this.$el.height());
    }
}

export { SettingsGeneralView };
