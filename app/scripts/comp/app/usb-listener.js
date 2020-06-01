import { Events } from 'framework/events';
import { Logger } from 'util/logger';
import { Launcher } from 'comp/launcher';
import { AppSettingsModel } from 'models/app-settings-model';
import { YubiKeyVendorId } from 'const/hardware';
import { Features } from 'util/features';

const logger = new Logger('usb-listener');

const UsbListener = {
    supported: Features.isDesktop,
    attachedYubiKeys: [],

    init() {
        if (!this.supported) {
            return;
        }

        AppSettingsModel.on('change:enableUsb', (model, enabled) => {
            if (enabled) {
                this.start();
            } else {
                this.stop();
            }
        });

        if (AppSettingsModel.enableUsb) {
            this.start();
        }
    },

    start() {
        logger.info('Starting USB listener');

        if (this.usb) {
            this.stop();
        }

        try {
            const ts = logger.ts();

            this.usb = Launcher.reqNative('usb');

            this.listen();

            this.attachedYubiKeys = this.usb
                .getDeviceList()
                .filter(this.isYubiKey)
                .map((device) => ({ device }));

            if (this.attachedYubiKeys.length > 0) {
                logger.info(`${this.attachedYubiKeys.length} YubiKey(s) found`, logger.ts(ts));
                Events.emit('usb-devices-changed');
            }
        } catch (e) {
            logger.error('Error loading USB module', e);
        }
    },

    stop() {
        logger.info('Stopping USB listener');

        if (this.usb) {
            if (this.attachedYubiKeys.length) {
                this.attachedYubiKeys = [];
                Events.emit('usb-devices-changed');
            }

            this.usb.off('attach', UsbListener.deviceAttached);
            this.usb.off('detach', UsbListener.deviceDetached);

            this.usb = null;
        }
    },

    listen() {
        this.usb.on('attach', UsbListener.deviceAttached);
        this.usb.on('detach', UsbListener.deviceDetached);
    },

    deviceAttached(device) {
        if (UsbListener.isYubiKey(device)) {
            UsbListener.attachedYubiKeys.push({ device });
            logger.info(`YubiKey attached, total: ${UsbListener.attachedYubiKeys.length}`, device);
            Events.emit('usb-devices-changed');
        }
    },

    deviceDetached(device) {
        if (UsbListener.isYubiKey(device)) {
            const index = UsbListener.attachedYubiKeys.findIndex(
                (yk) => yk.device.deviceAddress === device.deviceAddress
            );
            if (index >= 0) {
                UsbListener.attachedYubiKeys.splice(index, 1);
                logger.info(
                    `YubiKey detached, total: ${UsbListener.attachedYubiKeys.length}`,
                    device
                );
                Events.emit('usb-devices-changed');
            }
        }
    },

    isYubiKey(device) {
        return device.deviceDescriptor.idVendor === YubiKeyVendorId;
    }
};

export { UsbListener };
