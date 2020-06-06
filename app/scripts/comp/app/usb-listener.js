import { Events } from 'framework/events';
import { Logger } from 'util/logger';
import { NativeModules } from 'comp/launcher/native-modules';
import { AppSettingsModel } from 'models/app-settings-model';
import { Features } from 'util/features';

const logger = new Logger('usb-listener');

const UsbListener = {
    supported: Features.isDesktop,
    attachedYubiKeys: 0,

    init() {
        if (!this.supported) {
            return;
        }

        Events.on('native-modules-yubikeys', (e) => {
            if (e.numYubiKeys !== this.attachedYubiKeys) {
                logger.debug(`YubiKeys changed ${this.attachedYubiKeys} => ${e.numYubiKeys}`);
                this.attachedYubiKeys = e.numYubiKeys;
                Events.emit('usb-devices-changed');
            }
        });

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
            NativeModules.startUsbListener();
        } catch (e) {
            logger.error('Error starting USB listener', e);
        }
    },

    stop() {
        logger.info('Stopping USB listener');

        try {
            NativeModules.stopUsbListener();
        } catch (e) {
            logger.error('Error stopping USB listener', e);
        }

        if (this.attachedYubiKeys) {
            this.attachedYubiKeys = 0;
            Events.emit('usb-devices-changed');
        }
    }
};

export { UsbListener };
