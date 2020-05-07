import { Events } from 'framework/events';
import { ExternalOtpDeviceModel } from 'models/external/external-otp-device-model';
import { ExternalOtpEntryModel } from 'models/external/external-otp-entry-model';
import { Launcher } from 'comp/launcher';
import { Logger } from 'util/logger';
import { UsbListener } from 'comp/app/usb-listener';
import { AppSettingsModel } from 'models/app-settings-model';
import { Timeouts } from 'const/timeouts';

let ykmanStatus;

const logger = new Logger('yubikey');

class YubiKeyOtpModel extends ExternalOtpDeviceModel {
    constructor(props) {
        super({
            id: 'yubikey',
            name: 'YubiKey',
            shortName: 'YubiKey',
            deviceClassName: 'YubiKey',
            ...props
        });
    }

    static get ykmanStatus() {
        return ykmanStatus;
    }

    onUsbDevicesChanged = () => {
        if (UsbListener.attachedYubiKeys.length === 0) {
            this.emit('ejected');
        }
    };

    open(callback) {
        this._open(callback, true);
    }

    _open(callback, canRetry) {
        logger.info('Listing YubiKeys');

        if (UsbListener.attachedYubiKeys.length === 0) {
            return callback('No YubiKeys');
        }
        this.openProcess = Launcher.spawn({
            cmd: 'ykman',
            args: ['list'],
            noStdOutLogging: true,
            complete: (err, stdout) => {
                if (this.openAborted) {
                    return callback('Open aborted');
                }
                if (err) {
                    return callback(err);
                }

                const yubiKeysIncludingEmpty = stdout
                    .trim()
                    .split(/\n/g)
                    .map(line => (line.match(/\d{5,}$/g) || [])[0]);

                const yubiKeys = yubiKeysIncludingEmpty.filter(s => s);

                if (
                    yubiKeysIncludingEmpty.length === 1 &&
                    yubiKeys.length === 0 &&
                    stdout.startsWith('YubiKey') &&
                    stdout.includes('CCID') &&
                    !stdout.includes('Serial')
                ) {
                    logger.info('The YubiKey is probably stuck');
                    if (AppSettingsModel.yubiKeyOathWorkaround && canRetry) {
                        this._repairStuckYubiKey(callback);
                        return;
                    }
                }

                if (!yubiKeys || !yubiKeys.length) {
                    return callback('No YubiKeys returned by "ykman list"');
                }

                let openSuccess = 0;
                const openErrors = [];
                const openNextYubiKey = () => {
                    const yubiKey = yubiKeys.shift();
                    this._addYubiKey(yubiKey, err => {
                        if (this.openAborted) {
                            return callback('Open aborted');
                        }
                        if (err) {
                            openErrors.push(err);
                        } else {
                            openSuccess++;
                        }
                        if (yubiKeys && yubiKeys.length) {
                            openNextYubiKey();
                        } else {
                            callback(openSuccess ? null : openErrors[0]);
                        }
                    });
                };
                openNextYubiKey();
            }
        });
    }

    _addYubiKey(serial, callback) {
        logger.info('Adding YubiKey', serial);

        this.openProcess = Launcher.spawn({
            cmd: 'ykman',
            args: ['-d', serial, 'oath', 'code'],
            noStdOutLogging: true,
            throwOnStdErr: true,
            complete: (err, stdout) => {
                this.openProcess = null;
                if (this.openAborted) {
                    return callback('Open aborted');
                }
                if (err) {
                    return callback(err);
                }
                for (const line of stdout.split('\n')) {
                    const match = line.match(/^(.*?):(.*?)\s+(.*)$/);
                    if (!match) {
                        continue;
                    }
                    const [, title, user, code] = match;
                    const needsTouch = !code.match(/^\d+$/);

                    this.entries.push(
                        new ExternalOtpEntryModel({
                            id: title + ':' + user,
                            device: this,
                            deviceSubId: serial,
                            icon: 'clock-o',
                            title,
                            user,
                            needsTouch
                        })
                    );
                }
                this.active = true;
                Events.on('usb-devices-changed', this.onUsbDevicesChanged);
                callback();
            }
        });
    }

    _repairStuckYubiKey(callback) {
        logger.info('Repairing a stuck YubiKey');

        let openTimeout;
        const countYubiKeys = UsbListener.attachedYubiKeys.length;
        const onDevicesChangedDuringRepair = () => {
            if (UsbListener.attachedYubiKeys.length === countYubiKeys) {
                logger.info('YubiKey was reconnected');
                Events.off('usb-devices-changed', onDevicesChangedDuringRepair);
                clearTimeout(openTimeout);
                this.openAborted = false;
                setTimeout(() => {
                    this._open(callback, false);
                }, Timeouts.ExternalDeviceAfterReconnect);
            }
        };
        Events.on('usb-devices-changed', onDevicesChangedDuringRepair);

        Launcher.spawn({
            cmd: 'ykman',
            args: ['config', 'usb', '-e', 'oath', '-f'],
            noStdOutLogging: true,
            complete: err => {
                logger.info('Repair complete', err ? 'with error' : 'OK');
                if (err) {
                    Events.off('usb-devices-changed', onDevicesChangedDuringRepair);
                    return callback(err);
                }
                openTimeout = setTimeout(() => {
                    Events.off('usb-devices-changed', onDevicesChangedDuringRepair);
                }, Timeouts.ExternalDeviceReconnect);
            }
        });
    }

    cancelOpen() {
        logger.info('Cancel open');
        Events.off('usb-devices-changed', this.onUsbDevicesChanged);
        this.openAborted = true;
        if (this.openProcess) {
            logger.info('Killing the process');
            try {
                this.openProcess.kill();
            } catch {}
        }
    }

    getOtp(entry, callback) {
        const msPeriod = 30000;
        const timeLeft = msPeriod - (Date.now() % msPeriod) + 500;
        return Launcher.spawn({
            cmd: 'ykman',
            args: [
                '-d',
                entry.deviceSubId,
                'oath',
                'code',
                '--single',
                `${entry.title}:${entry.user}`
            ],
            noStdOutLogging: true,
            complete: (err, stdout) => {
                if (err) {
                    return callback(err, null, timeLeft);
                }
                const otp = stdout.trim();
                callback(null, otp, timeLeft);
            }
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

    static checkToolStatus() {
        if (ykmanStatus === 'ok') {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            ykmanStatus = 'checking';
            Launcher.spawn({
                cmd: 'ykman',
                args: ['-v'],
                noStdOutLogging: true,
                complete: (err, stdout, code) => {
                    if (err || code !== 0) {
                        ykmanStatus = 'error';
                    } else {
                        ykmanStatus = 'ok';
                    }
                    resolve();
                }
            });
        });
    }
}

YubiKeyOtpModel.defineModelProperties({
    onUsbDevicesChanged: null,
    openProcess: null,
    openAborted: false
});

export { YubiKeyOtpModel };
