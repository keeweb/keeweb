import { Model } from 'framework/model';
import { SettingsStore } from 'comp/settings/settings-store';

class AppSettingsModel extends Model {
    constructor() {
        super();
        this.on('change', () => this.save());
    }

    load() {
        return SettingsStore.load('app-settings').then(data => {
            if (data) {
                this.upgrade(data);
                this.set(data, { silent: true });
            }
        });
    }

    upgrade(data) {
        if (data.rememberKeyFiles === true) {
            data.rememberKeyFiles = 'data';
        }
    }

    save() {
        SettingsStore.save('app-settings', this);
    }
}

AppSettingsModel.defineModelProperties(
    {
        theme: 'fb',
        locale: null,
        expandGroups: true,
        listViewWidth: null,
        menuViewWidth: null,
        tagsViewHeight: null,
        autoUpdate: 'install',
        clipboardSeconds: 0,
        autoSave: true,
        autoSaveInterval: 0,
        rememberKeyFiles: false,
        idleMinutes: 15,
        minimizeOnClose: false,
        tableView: false,
        colorfulIcons: false,
        useMarkdown: true,
        directAutotype: true,
        titlebarStyle: 'default',
        lockOnMinimize: true,
        lockOnCopy: false,
        lockOnAutoType: false,
        lockOnOsLock: false,
        helpTipCopyShown: false,
        templateHelpShown: false,
        skipOpenLocalWarn: false,
        hideEmptyFields: false,
        skipHttpsWarning: false,
        demoOpened: false,
        fontSize: 0,
        tableViewColumns: null,
        generatorPresets: null,
        generatorHidePassword: false,
        cacheConfigSettings: false,
        allowIframes: false,

        canOpen: true,
        canOpenDemo: true,
        canOpenSettings: true,
        canCreate: true,
        canImportXml: true,
        canImportCsv: true,
        canRemoveLatest: true,
        canExportXml: true,
        canExportHtml: true,

        dropbox: true,
        webdav: true,
        gdrive: true,
        onedrive: true
    },
    { extensions: true }
);

const instance = new AppSettingsModel();

export { instance as AppSettingsModel };
