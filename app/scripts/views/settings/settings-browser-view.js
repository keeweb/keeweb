import { View } from 'framework/views/view';
import template from 'templates/settings/settings-browser.hbs';
import { Features } from 'util/features';
import { Links } from 'const/links';
import { AppSettingsModel } from 'models/app-settings-model';
import { Locale } from 'util/locale';
import {
    BrowserExtensionConnector,
    SupportedBrowsers,
    SupportedExtensions
} from 'comp/extension/browser-extension-connector';

class SettingsBrowserView extends View {
    template = template;

    events = {
        'change .check-enable-for-browser': 'changeEnableForBrowser',
        'change .settings__browser-focus-if-locked': 'changeFocusIfLocked'
    };

    render() {
        const data = {
            desktop: Features.isDesktop,
            icon: Features.browserIcon,
            focusIfLocked: AppSettingsModel.extensionFocusIfLocked
        };
        if (Features.isDesktop) {
            data.extensionNames = ['KeeWeb Connect', 'KeePassXC-Browser'];
            data.settingsPerBrowser = this.getSettingsPerBrowser();
            data.anyBrowserIsEnabled = BrowserExtensionConnector.isEnabled();
        } else {
            const extensionBrowserFamily = Features.extensionBrowserFamily;
            data.extensionBrowserFamily = Features.extensionBrowserFamily;
            data.extensionDownloadLink = Links[`KeeWebConnectFor${extensionBrowserFamily}`];
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

    changeEnableForBrowser(e) {
        const enabled = e.target.checked;
        const browser = e.target.dataset.browser;
        const extension = e.target.dataset.extension;

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
}

export { SettingsBrowserView };
