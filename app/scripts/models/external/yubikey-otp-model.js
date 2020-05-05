import { ExternalOtpDeviceModel } from 'models/external/external-otp-device-model';
import { ExternalOtpEntryModel } from 'models/external/external-otp-entry-model';
import { Launcher } from 'comp/launcher';

let ykmanStatus;

class YubiKeyOtpModel extends ExternalOtpDeviceModel {
    constructor(props) {
        super({
            id: 'yubikey',
            name: 'YubiKey',
            shortName: 'YubiKey',
            ...props
        });
    }

    static get ykmanStatus() {
        return ykmanStatus;
    }

    open(callback) {
        this.openProcess = Launcher.spawn({
            cmd: 'ykman',
            args: ['oath', 'code'],
            noStdOutLogging: true,
            complete: (err, stdout, code) => {
                this.openProcess = null;
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
                callback();
            }
        });
    }

    cancelOpen() {
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
    openProcess: null,
    openAborted: false
});

export { YubiKeyOtpModel };
