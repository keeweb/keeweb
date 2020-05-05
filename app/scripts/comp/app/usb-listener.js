import EventEmitter from 'events';
import { Events } from 'framework/events';
import { Logger } from 'util/logger';
import { Launcher } from 'comp/launcher';
import { AppSettingsModel } from 'models/app-settings-model';
import { YubiKeyVendorId } from 'const/hardware';

const logger = new Logger('usb-listener');

const UsbListener = {
    supported: Launcher && !(process.platform === 'win32' && !process.arch.includes('64')),
    attachedYubiKeys: 0,

    init() {
        if (!Launcher) {
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

            const usb = Launcher.req(`@keeweb/keeweb-native-modules/usb.${process.platform}.node`);

            Object.keys(EventEmitter.prototype).forEach(key => {
                usb[key] = EventEmitter.prototype[key];
            });

            this.usb = usb;

            this.listen();

            this.attachedYubiKeys = usb
                .getDeviceList()
                .filter(this.isYubiKey)
                .map(device => ({ device }));

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
            this.usb._disableHotplugEvents();

            if (this.attachedYubiKeys.length) {
                this.attachedYubiKeys = [];
                Events.emit('usb-devices-changed');
            }

            this.usb = null;
        }
    },

    listen() {
        this.usb.on('attach', device => {
            if (this.isYubiKey(device)) {
                this.attachedYubiKeys.push({ device });
                logger.info(`YubiKey attached, total: ${this.attachedYubiKeys.length}`, device);
                Events.emit('usb-devices-changed');
            }
        });

        this.usb.on('detach', device => {
            if (this.isYubiKey(device)) {
                const index = this.attachedYubiKeys.findIndex(
                    yk => yk.device.deviceAddress === device.deviceAddress
                );
                if (index >= 0) {
                    this.attachedYubiKeys.splice(index, 1);
                    logger.info(`YubiKey detached, total: ${this.attachedYubiKeys.length}`, device);
                    Events.emit('usb-devices-changed');
                }
            }
        });

        this.usb._enableHotplugEvents();
    },

    isYubiKey(device) {
        return device.deviceDescriptor.idVendor === YubiKeyVendorId;
    }
};

export { UsbListener };
