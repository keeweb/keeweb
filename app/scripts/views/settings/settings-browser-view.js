import { Events } from 'framework/events';
import { View } from 'framework/views/view';
import template from 'templates/settings/settings-browser.hbs';
import { Features } from 'util/features';
import { Links } from 'const/links';
import { AppSettingsModel } from 'models/app-settings-model';
import { RuntimeDataModel } from 'models/runtime-data-model';
import { Locale } from 'util/locale';
import {
    BrowserExtensionConnector,
    SupportedBrowsers,
    SupportedExtensions
} from 'comp/extension/browser-extension-connector';
import { Alerts } from 'comp/ui/alerts';
import { DateFormat } from 'comp/i18n/date-format';

class SettingsBrowserView extends View {
    template = template;

    events = {
        'change .check-enable-for-browser': 'changeEnableForBrowser',
        'change .settings__browser-focus-if-locked': 'changeFocusIfLocked',
        'change .settings__browser-focus-if-empty': 'changeFocusIfEmpty',
        'change .settings__browser-session-ask-get': 'changeSessionAskGet',
        'change .settings__browser-session-ask-save': 'changeSessionAskSave',
        'change .settings__browser-session-file-check': 'changeSessionFileAccess',
        'click .settings__browser-btn-terminate-session': 'terminateSession'
    };

    constructor(model, options) {
        super(model, options);

        this.listenTo(Events, 'browser-extension-sessions-changed', this.render);
    }

    render() {
        const data = {
            desktop: Features.isDesktop,
            icon: Features.browserIcon,
            focusIfLocked: AppSettingsModel.extensionFocusIfLocked,
            focusIfEmpty: AppSettingsModel.extensionFocusIfEmpty,
            sessions: BrowserExtensionConnector.sessions.map((session) => {
                const fileAccess = this.getSessionFileAccess(session);
                return {
                    ...session,
                    fileAccess,
                    noFileAccess: fileAccess && !fileAccess.some((f) => f.checked),
                    showAskSave: session.permissions?.askSave !== undefined,
                    connectedDate: DateFormat.dtStr(session.connectedDate)
                };
            })
        };
        if (Features.isDesktop) {
            data.extensionNames = ['KeeWeb Connect', 'KeePassXC-Browser'];
            data.settingsPerBrowser = this.getSettingsPerBrowser();
            data.anyBrowserIsEnabled = BrowserExtensionConnector.isEnabled();
        } else {
            const extensionBrowserFamily = Features.extensionBrowserFamily;
            data.extensionBrowserFamily = Features.extensionBrowserFamily;
            data.extensionDownloadLink = Links[`KWCFor${extensionBrowserFamily}`];
        }
        super.render(data);
    }

    getSettingsPerBrowser() {
        return SupportedBrowsers.map((browser) => {
            const browserName = browser === 'Other' ? Locale.setBrowserOtherBrowsers : browser;
            const extensions = SupportedExtensions.map((ext) => {
                ext = {
                    ...ext,
                    supported: true,
                    enabled: !!AppSettingsModel[`extensionEnabled${ext.alias}${browser}`],
                    installUrl: Links[`${ext.alias}For${browser}`]
                };
                if (ext.alias === 'KPXC') {
                    ext.manualUrl = Links.ExtensionHelpForKPXC;
                }
                if (!ext.installUrl) {
                    if (browser === 'Other') {
                        ext.helpUrl = Links.ExtensionHelpForOtherBrowsers;
                    } else {
                        ext.supported = false;
                    }
                }
                return ext;
            });
            return { browser, browserName, extensions };
        });
    }

    getSessionFileAccess(session) {
        if (!session.permissions) {
            return undefined;
        }

        const files = this.appModel.files.map((file) => ({
            id: file.id,
            name: file.name,
            checked: session.permissions.files.includes(file.id) || session.permissions.allFiles
        }));

        for (const fileId of session.permissions.files) {
            if (!this.appModel.files.get(fileId)) {
                const fileInfo = this.appModel.fileInfos.get(fileId);
                if (fileInfo) {
                    files.push({ id: fileId, name: fileInfo.name, checked: true });
                }
            }
        }

        files.push({
            id: 'all',
            name: files.length
                ? Locale.extensionConnectAllOtherFiles
                : Locale.extensionConnectAllFiles,
            checked: session.permissions.allFiles
        });

        return files;
    }

    changeEnableForBrowser(e) {
        const enabled = e.target.checked;
        const browser = e.target.dataset.browser;
        const extension = e.target.dataset.extension;

        if (enabled && extension === 'KPXC' && !RuntimeDataModel.kpxcExtensionWarningShown) {
            e.target.checked = false;

            Alerts.yesno({
                icon: 'exclamation-triangle',
                header: Locale.setBrowserExtensionKPXCWarnHeader.replace('{}', 'KeePassXC'),
                body:
                    Locale.setBrowserExtensionKPXCWarnBody1.replace(/{}/g, 'KeePassXC') +
                    '\n' +
                    Locale.setBrowserExtensionKPXCWarnBody2,
                success: () => {
                    RuntimeDataModel.kpxcExtensionWarningShown = true;
                    this.enableForBrowser(enabled, browser, extension);
                }
            });
        } else {
            this.enableForBrowser(enabled, browser, extension);
        }
    }

    enableForBrowser(enabled, browser, extension) {
        const setting = `extensionEnabled${extension}${browser}`;
        if (setting) {
            AppSettingsModel[setting] = enabled;
        } else {
            delete AppSettingsModel[setting];
        }

        BrowserExtensionConnector.enable(browser, extension, enabled);

        this.render();
    }

    changeFocusIfLocked(e) {
        AppSettingsModel.extensionFocusIfLocked = e.target.checked;
        this.render();
    }

    changeFocusIfEmpty(e) {
        AppSettingsModel.extensionFocusIfEmpty = e.target.checked;
        this.render();
    }

    changeSessionAskGet(e) {
        const clientId = e.target.dataset.clientId;
        const askGet = e.target.value;

        BrowserExtensionConnector.setClientPermissions(clientId, { askGet });
    }

    changeSessionAskSave(e) {
        const clientId = e.target.dataset.clientId;
        const askSave = e.target.value;

        BrowserExtensionConnector.setClientPermissions(clientId, { askSave });
    }

    changeSessionFileAccess(e) {
        const clientId = e.target.dataset.clientId;
        const fileId = e.target.dataset.fileId;
        const enabled = e.target.checked;

        if (fileId === 'all') {
            const allFiles = enabled;
            const permChanges = { allFiles };
            if (allFiles) {
                permChanges.files = this.appModel.files.map((f) => f.id);
            }
            BrowserExtensionConnector.setClientPermissions(clientId, permChanges);
        } else {
            const permissions = BrowserExtensionConnector.getClientPermissions(clientId);
            let files;
            if (enabled) {
                files = permissions.files.concat(fileId);
            } else {
                files = permissions.files.filter((f) => f !== fileId);
            }
            const permChanges = { files };
            if (!enabled) {
                permChanges.allFiles = false;
            }
            BrowserExtensionConnector.setClientPermissions(clientId, permChanges);
        }
        this.render();
    }

    terminateSession(e) {
        const connectionId = e.target.dataset.connectionId;
        BrowserExtensionConnector.terminateConnection(connectionId);
    }
}

export { SettingsBrowserView };
