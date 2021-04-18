import { View } from 'framework/views/view';
import template from 'templates/settings/settings-browser.hbs';
import { Features } from 'util/features';
import { Links } from 'const/links';
import { AppSettingsModel } from 'models/app-settings-model';

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
            data.settingsPerBrowser = this.getSettingsPerBrowser();
            data.anyBrowserIsEnabled = data.settingsPerBrowser.some((s) => s.kwc || s.kpxc);
        } else {
            const extensionBrowserFamily = Features.extensionBrowserFamily;
            data.extensionBrowserFamily = Features.extensionBrowserFamily;
            data.extensionDownloadLink = Links[`KeeWebConnectFor${extensionBrowserFamily}`];
        }
        super.render(data);
    }

    getSettingsPerBrowser() {
        const browsers = ['Chrome', 'Firefox', 'Edge'];
        if (Features.isMac) {
            browsers.unshift('Safari');
        }
        return browsers.map((browser) => {
            return {
                browser,
                kwc: !!AppSettingsModel[`kwcEnabledFor${browser}`],
                kpxc: !!AppSettingsModel[`kpxcEnabledFor${browser}`]
            };
        });
    }

    changeEnableForBrowser(e) {
        const enabled = e.target.checked;
        const browser = e.target.dataset.browser;
        const extension = e.target.dataset.extension;

        const setting = `${extension}EnabledFor${browser}`;
        if (setting) {
            AppSettingsModel[setting] = enabled;
        } else {
            delete AppSettingsModel[setting];
        }

        this.render();
    }

    changeFocusIfLocked(e) {
        AppSettingsModel.extensionFocusIfLocked = e.target.checked;
        this.render();
    }
}

export { SettingsBrowserView };
