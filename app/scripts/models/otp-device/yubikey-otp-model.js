import { Events } from 'framework/events';
import { OtpDeviceModel } from './otp-device-model';
import { OtpEntryModel } from './otp-entry-model';
import { Logger } from 'util/logger';
import { UsbListener } from 'comp/app/usb-listener';
import { YubiKey } from 'comp/app/yubikey';

const logger = new Logger('yubikey');

class YubiKeyOtpModel extends OtpDeviceModel {
    constructor(props) {
        super({
            id: 'yubikey',
            name: 'YubiKey',
            shortName: 'YubiKey',
            deviceClassName: 'YubiKey',
            ...props
        });
    }

    onUsbDevicesChanged = () => {
        if (UsbListener.attachedYubiKeys === 0) {
            this.emit('ejected');
        }
    };

    open(callback) {
        YubiKey.listWithYkman((err, yubiKeys) => {
            if (err) {
                return callback(err);
            }

            let openSuccess = 0;
            const openErrors = [];
            const openNextYubiKey = () => {
                const yubiKey = yubiKeys.shift();
                this._addYubiKey(yubiKey.serial, (err) => {
                    if (YubiKey.aborted) {
                        return callback('Aborted');
                    }
                    if (err) {
                        openErrors.push(err);
                    } else {
                        openSuccess++;
                    }
                    if (yubiKeys && yubiKeys.length) {
                        openNextYubiKey();
                    } else {
                        if (openSuccess) {
                            this._openComplete();
                        }
                        callback(openSuccess ? null : openErrors[0]);
                    }
                });
            };
            openNextYubiKey();
        });
    }

    _addYubiKey(serial, callback) {
        logger.info('Adding YubiKey', serial);

        YubiKey.getOtpCodes(serial, (err, codes) => {
            if (err) {
                return callback(err);
            }

            for (const code of codes) {
                this.entries.push(
                    new OtpEntryModel({
                        id: this.entryId(code.title, code.user),
                        file: this,
                        device: this,
                        deviceSubId: serial,
                        icon: 'clock',
                        title: code.title,
                        user: code.user,
                        needsTouch: code.needsTouch
                    })
                );
            }

            callback();
        });
    }

    _openComplete() {
        this.active = true;
        this._buildEntryMap();
        Events.on('usb-devices-changed', this.onUsbDevicesChanged);
    }

    cancelOpen() {
        YubiKey.abort();
        Events.off('usb-devices-changed', this.onUsbDevicesChanged);
    }

    getOtp(entry, callback) {
        const msPeriod = 30000;
        const timeLeft = msPeriod - (Date.now() % msPeriod) + 500;
        YubiKey.getOtp(entry.deviceSubId, `${entry.title}:${entry.user}`, (err, otp) => {
            callback(err, otp, timeLeft);
        });
    }

    cancelGetOtp(entry, ps) {
        if (ps) {
            ps.kill();
        }
    }

    close(callback) {
        Events.off('usb-devices-changed', this.onUsbDevicesChanged);
        this.set({
            active: false
        });
    }
}

YubiKeyOtpModel.defineModelProperties({
    onUsbDevicesChanged: null
});

export { YubiKeyOtpModel };
