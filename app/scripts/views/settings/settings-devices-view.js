import { Events } from 'framework/events';
import { View } from 'framework/views/view';
import { AppSettingsModel } from 'models/app-settings-model';
import { YubiKey } from 'comp/app/yubikey';
import { Links } from 'const/links';
import { UsbListener } from 'comp/app/usb-listener';
import template from 'templates/settings/settings-devices.hbs';

class SettingsDevicesView extends View {
    template = template;

    events = {
        'change .settings__devices-enable-usb': 'changeEnableUsb',
        'change .settings__yubikey-show-icon': 'changeYubiKeyShowIcon',
        'change .settings__yubikey-auto-open': 'changeYubiKeyAutoOpen',
        'change .settings__yubikey-match-entries': 'changeYubiKeyMatchEntries',
        'change .settings__yubikey-chalresp-show': 'changeYubiKeyShowChalResp',
        'change .settings__yubikey-remember-chalresp': 'changeYubiKeyRememberChalResp',
        'change .settings__yubikey-stuck-workaround': 'changeYubiKeyStuckWorkaround'
    };

    constructor(...args) {
        super(...args);
        if (!['ok', 'checking'].includes(YubiKey.ykmanStatus)) {
            this.toolCheckPromise = YubiKey.checkToolStatus();
        }
    }

    render() {
        if (this.toolCheckPromise) {
            this.toolCheckPromise.then(() => this.render());
            this.toolCheckPromise = undefined;
        }
        super.render({
            supported: UsbListener.supported,
            enableUsb: UsbListener.supported && AppSettingsModel.enableUsb,
            ykmanStatus: YubiKey.ykmanStatus,
            yubiKeyShowIcon: AppSettingsModel.yubiKeyShowIcon,
            yubiKeyAutoOpen: AppSettingsModel.yubiKeyAutoOpen,
            yubiKeyMatchEntries: AppSettingsModel.yubiKeyMatchEntries,
            yubiKeyShowChalResp: AppSettingsModel.yubiKeyShowChalResp,
            yubiKeyRememberChalResp: AppSettingsModel.yubiKeyRememberChalResp,
            yubiKeyStuckWorkaround: AppSettingsModel.yubiKeyStuckWorkaround,
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
        Events.emit('refresh');
    }

    changeYubiKeyShowChalResp(e) {
        AppSettingsModel.yubiKeyShowChalResp = e.target.checked;
        this.render();
    }

    changeYubiKeyRememberChalResp(e) {
        AppSettingsModel.yubiKeyRememberChalResp = e.target.checked;
        this.render();
    }

    changeYubiKeyStuckWorkaround(e) {
        AppSettingsModel.yubiKeyStuckWorkaround = e.target.checked;
        this.render();
    }
}

export { SettingsDevicesView };
