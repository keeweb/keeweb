import { View } from 'framework/views/view';
import { AppSettingsModel } from 'models/app-settings-model';
import template from 'templates/settings/settings-devices.hbs';
import { Links } from 'const/links';

class SettingsDevicesView extends View {
    template = template;

    events = {
        'change .settings__devices-enable-usb': 'changeEnableUsb',
        'change .settings__yubikey-show-icon': 'changeYubiKeyShowIcon',
        'change .settings__yubikey-auto-open': 'changeYubiKeyAutoOpen',
        'change .settings__yubikey-match-entries': 'changeYubiKeyMatchEntries',
        'change .settings__yubikey-chalresp-show': 'changeYubiKeyShowChalResp'
    };

    render() {
        super.render({
            enableUsb: AppSettingsModel.enableUsb,
            yubiKeyShowIcon: AppSettingsModel.yubiKeyShowIcon,
            yubiKeyAutoOpen: AppSettingsModel.yubiKeyAutoOpen,
            yubiKeyMatchEntries: AppSettingsModel.yubiKeyMatchEntries,
            yubiKeyShowChalResp: AppSettingsModel.yubiKeyShowChalResp,
            yubiKeyManualLink: Links.YubiKeyManual
        });
    }

    changeEnableUsb(e) {
        AppSettingsModel.enableUsb = e.target.checked;
        this.render();
    }

    changeYubiKeyShowIcon(e) {
        AppSettingsModel.yubiKeyShowIcon = e.target.checked;
        this.render();
    }

    changeYubiKeyAutoOpen(e) {
        AppSettingsModel.yubiKeyAutoOpen = e.target.checked;
        this.render();
    }

    changeYubiKeyMatchEntries(e) {
        AppSettingsModel.yubiKeyMatchEntries = e.target.checked;
        this.render();
    }

    changeYubiKeyShowChalResp(e) {
        AppSettingsModel.yubiKeyShowChalResp = e.target.checked;
        this.render();
    }
}

export { SettingsDevicesView };
