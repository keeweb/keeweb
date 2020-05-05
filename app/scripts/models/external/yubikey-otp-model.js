import { Events } from 'framework/events';
import { ExternalOtpDeviceModel } from 'models/external/external-otp-device-model';
import { ExternalOtpEntryModel } from 'models/external/external-otp-entry-model';
import { Launcher } from 'comp/launcher';
import { UsbListener } from 'comp/app/usb-listener';

let ykmanStatus;

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
        this.openProcess = Launcher.spawn({
            cmd: 'ykman',
            args: ['oath', 'code'],
            noStdOutLogging: true,
            complete: (err, stdout, code) => {
                this.openProcess = null;
                if (this.openAborted) {
                    err = 'Open aborted';
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
        Events.off('usb-devices-changed', this.onUsbDevicesChanged);
        this.openAborted = true;
        if (this.openProcess) {
            this.openProcess.kill();
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
