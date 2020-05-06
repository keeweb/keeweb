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
        logger.info('Opening');
        this.openProcess = Launcher.spawn({
            cmd: 'ykman',
            args: ['oath', 'code'],
            noStdOutLogging: true,
            complete: (err, stdout, code, stderr) => {
                logger.info('Open complete with code', code);
                this.openProcess = null;
                if (this.openAborted) {
                    return callback('Open aborted');
                }
                const isStuck =
                    code === 2 && stderr && stderr.includes('Make sure the application');
                if (isStuck) {
                    logger.info('The YubiKey is probably stuck');
                }
                if (isStuck && canRetry && AppSettingsModel.yubiKeyOathWorkaround) {
                    logger.info('Repairing a stuck YubiKey');

                    let openTimeout;
                    const countYubiKeys = UsbListener.attachedYubiKeys.length;
                    const onDevicesChangedDuringRepair = () => {
                        if (UsbListener.attachedYubiKeys.length === countYubiKeys) {
                            logger.info('YubiKey was reconnected');
                            Events.off('usb-devices-changed', onDevicesChangedDuringRepair);
                            clearTimeout(openTimeout);
                            this.openAborted = false;
                            this._open(callback, false);
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
                    return;
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

    cancelOpen() {
        logger.info('Cancel open');
        Events.off('usb-devices-changed', this.onUsbDevicesChanged);
        this.openAborted = true;
        if (this.openProcess) {
            this.openProcess.kill();
            logger.info('Killed the process');
        }
    }

    getOtp(entry, callback) {
        const msPeriod = 30000;
        const timeLeft = msPeriod - (Date.now() % msPeriod) + 500;
        return Launcher.spawn({
            cmd: 'ykman',
            args: ['oath', 'code', '--single', `${entry.title}:${entry.user}`],
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
