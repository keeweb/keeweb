import { Events } from 'framework/events';
import { View } from 'framework/views/view';
import { YubiKey } from 'comp/app/yubikey';
import { Features } from 'util/features';
import { Locale } from 'util/locale';
import { Timeouts } from 'const/timeouts';
import template from 'templates/open-chal-resp.hbs';

class OpenChalRespView extends View {
    template = template;

    events = {
        'click .open-chal-resp__item': 'itemClick'
    };

    constructor() {
        super();

        this.listenTo(Events, 'usb-devices-changed', this.usbDevicesChanged);

        this.checkDevices();
    }

    render() {
        let error = this.error;

        const isEmpty = this.yubiKeys && !this.yubiKeys.length;
        if (isEmpty) {
            error = Locale.openChalRespErrorEmpty;
        }

        super.render({
            error,
            showEmptyMacWarning: isEmpty && Features.isMac,
            yubiKeys: this.yubiKeys,
            loading: !this.yubiKeys && !this.error
        });
    }

    usbDevicesChanged() {
        setTimeout(() => {
            if (!this.removed) {
                this.checkDevices();
            }
        }, Timeouts.ExternalDeviceAfterReconnect);
    }

    checkDevices() {
        YubiKey.list((err, yubiKeys) => {
            if (this.removed) {
                return;
            }
            this.error = err;
            this.yubiKeys = [];
            if (yubiKeys) {
                for (const { fullName, vid, pid, serial, slots } of yubiKeys) {
                    for (const slot of slots.filter((s) => s.valid)) {
                        this.yubiKeys.push({
                            fullName,
                            vid,
                            pid,
                            serial,
                            slot: slot.number
                        });
                    }
                }
            }
            this.render();
        });
    }

    itemClick(e) {
        const el = e.target.closest('[data-serial]');
        const vid = +el.dataset.vid;
        const pid = +el.dataset.pid;
        const serial = +el.dataset.serial;
        const slot = +el.dataset.slot;
        this.emit('select', { vid, pid, serial, slot });
    }
}

export { OpenChalRespView };
