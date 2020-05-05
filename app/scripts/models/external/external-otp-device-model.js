import { ExternalDeviceModel } from 'models/external/external-device-model';

class ExternalOtpDeviceModel extends ExternalDeviceModel {
    open(callback) {
        throw 'Not implemented';
    }

    cancelOpen() {
        throw 'Not implemented';
    }

    close(callback) {
        throw 'Not implemented';
    }

    getOtp(callback) {
        throw 'Not implemented';
    }
}

export { ExternalOtpDeviceModel };
