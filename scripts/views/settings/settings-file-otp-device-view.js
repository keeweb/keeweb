import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import template from 'templates/settings/settings-file-otp-device.hbs';

class SettingsFileOtpDeviceView extends View {
    template = template;

    events = {
        'click .settings__file-button-settings': 'openDevicesSettings',
        'click .settings__file-button-close': 'closeFile'
    };

    render() {
        super.render({
            name: this.model.name,
            deviceClassName: this.model.deviceClassName
        });
    }

    openDevicesSettings() {
        Events.emit('toggle-settings', 'devices');
    }

    closeFile() {
        this.appModel.closeFile(this.model);
    }
}

export { SettingsFileOtpDeviceView };
