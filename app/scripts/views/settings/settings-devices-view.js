import { View } from 'framework/views/view';
import { AppSettingsModel } from 'models/app-settings-model';
import { YubiKeyOtpModel } from 'models/external/yubikey-otp-model';
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

    constructor(...args) {
        super(...args);
        if (!['ok', 'checking'].includes(YubiKeyOtpModel.ykmanStatus)) {
            this.toolCheckPromise = YubiKeyOtpModel.checkToolStatus();
        }
    }

    render() {
        if (this.toolCheckPromise) {
            this.toolCheckPromise.then(() => this.render());
            this.toolCheckPromise = undefined;
        }
        super.render({
            enableUsb: AppSettingsModel.enableUsb,
            ykmanStatus: YubiKeyOtpModel.ykmanStatus,
            yubiKeyShowIcon: AppSettingsModel.yubiKeyShowIcon,
            yubiKeyAutoOpen: AppSettingsModel.yubiKeyAutoOpen,
            yubiKeyMatchEntries: AppSettingsModel.yubiKeyMatchEntries,
            yubiKeyShowChalResp: AppSettingsModel.yubiKeyShowChalResp,
            yubiKeyManualLink: Links.YubiKeyManual,
            ykmanInstallLink: Links.YubiKeyManagerInstall
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
