import { ExternalEntryModel } from 'models/external/external-entry-model';

class ExternalOtpEntryModel extends ExternalEntryModel {
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
        this.otpGenerator = {
            next: callback => {
                this.otpState = this.device.getOtp(this, callback);
            },
            cancel: () => {
                this.device.cancelGetOtp(this, this.otpState);
            }
        };
    }

    _buildFields() {
        super._buildFields();
        this.fields.UserName = this.user;
    }
}

ExternalOtpEntryModel.defineModelProperties({
    user: undefined,
    otpGenerator: undefined,
    needsTouch: false,
    otpState: null
});

export { ExternalOtpEntryModel };
