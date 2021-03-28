import { OtpDeviceEntryModel } from './otp-device-entry-model';

class OtpEntryModel extends OtpDeviceEntryModel {
    constructor(props) {
        super({
            ...props,
            description: props.user
        });
    }

    initOtpGenerator() {
        if (this.otpGenerator) {
            return;
        }
        const gen = {
            next: (callback) => {
                if (gen.otp && gen.expires) {
                    const timeLeft = gen.expires - Date.now();
                    if (timeLeft > 0) {
                        return callback(null, gen.otp, timeLeft);
                    }
                }
                if (gen.promise) {
                    gen.promise.then(({ err, otp, timeLeft }) => {
                        callback(err, otp, timeLeft);
                    });
                    return;
                }
                gen.promise = new Promise((resolve) => {
                    gen.otpState = this.device.getOtp(this, (err, otp, timeLeft) => {
                        gen.otpState = null;
                        gen.promise = null;

                        if (otp && timeLeft > 0) {
                            gen.otp = otp;
                            gen.expires = Date.now() + timeLeft;
                        } else {
                            gen.otp = null;
                            gen.expires = null;
                        }

                        callback(err, otp, timeLeft);
                        resolve({ err, otp, timeLeft });
                    });
                });
            },
            cancel: () => {
                if (this.otpState) {
                    this.device.cancelGetOtp(this, this.otpState);
                }
            }
        };
        this.otpGenerator = gen;
    }

    _buildFields() {
        super._buildFields();
        this.fields.UserName = this.user;
    }
}

OtpEntryModel.defineModelProperties({
    user: undefined,
    backend: 'otp-device',
    otpGenerator: undefined,
    needsTouch: false
});

export { OtpEntryModel };
