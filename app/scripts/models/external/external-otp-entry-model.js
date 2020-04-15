import { ExternalEntryModel } from 'models/external/external-entry-model';

class ExternalOtpEntryModel extends ExternalEntryModel {
    constructor(props) {
        super(props);
        this.description = props.user;
    }

    initOtpGenerator() {
        this.otpGenerator = {
            next: callback => {
                this.otpState = this.device.getOtp(this, callback);
            },
            cancel: () => {
                this.device.cancelGetOtp(this, this.otpState);
            }
        };
    }
}

ExternalOtpEntryModel.defineModelProperties({
    user: undefined,
    otpGenerator: undefined,
    needsTouch: false,
    otpState: null
});

export { ExternalOtpEntryModel };
