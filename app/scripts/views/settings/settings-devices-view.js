import { View } from 'framework/views/view';
import { AppSettingsModel } from 'models/app-settings-model';
import template from 'templates/settings/settings-devices.hbs';

class SettingsDevicesView extends View {
    template = template;

    events = {
        'change .settings__devices-enable-usb': 'changeEnableUsb'
    };

    render() {
        super.render({
            enableUsb: AppSettingsModel.enableUsb
        });
    }

    changeEnableUsb(e) {
        AppSettingsModel.enableUsb = e.target.checked;
        this.render();
    }
}

export { SettingsDevicesView };
