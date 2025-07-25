import { Timeouts } from 'const/timeouts';
import { FieldViewText } from 'views/fields/field-view-text';
import { Locale } from 'util/locale';
import { StringFormat } from 'util/formatting/string-format';

const MinOpacity = 0.1;

class FieldViewOtp extends FieldViewText {
    otpTimeout = null;
    otpTickInterval = null;
    otpValue = null;
    otpGenerator = null;
    otpTimeLeft = 0;
    otpValidUntil = 0;
    fieldOpacity = null;
    otpState = null;

    constructor(model, options) {
        super(model, options);
        this.once('remove', () => this.stopOtpUpdater());
        if (model.readonly) {
            this.readonly = true;
        }
    }

    renderValue(value) {
        if (!value) {
            this.resetOtp();
            return '';
        }
        if (value !== this.otpGenerator) {
            this.resetOtp();
            this.otpGenerator = value;
            this.requestOtpUpdate();
        }
        if (this.otpValue) {
            return this.otpValue;
        }
        switch (this.otpState) {
            case 'awaiting-command':
                return Locale.detOtpClickToTouch;
            case 'awaiting-touch':
                return Locale.detOtpTouch.replace('{}', this.model.deviceShortName);
            case 'error':
                return StringFormat.capFirst(Locale.error);
            case 'generating':
                return Locale.detOtpGenerating;
            default:
                return '';
        }
    }

    getEditValue(value) {
        return value && value.url;
    }

    getTextValue() {
        return this.otpValue;
    }

    render() {
        super.render();
        this.fieldOpacity = null;
        this.otpTick();
    }

    resetOtp() {
        this.otpGenerator = null;
        this.otpValue = null;
        this.otpTimeLeft = 0;
        this.otpValidUntil = 0;
        this.otpState = null;
        if (this.otpTimeout) {
            clearTimeout(this.otpTimeout);
            this.otpTimeout = null;
        }
        if (this.otpTickInterval) {
            clearInterval(this.otpTickInterval);
            this.otpTickInterval = null;
        }
    }

    requestOtpUpdate() {
        if (this.value) {
            if (this.model.needsTouch) {
                this.otpState = 'awaiting-command';
            } else {
                this.otpState = 'generating';
                this.value.next(this.otpUpdated.bind(this));
            }
        }
    }

    otpUpdated(err, pass, timeLeft) {
        if (this.removed) {
            return;
        }
        if (err) {
            this.otpState = 'error';
            this.render();
            return;
        }
        if (!this.value || !pass) {
            this.resetOtp();
            return;
        }
        this.otpValue = pass;
        this.otpTimeLeft = timeLeft || 0;
        this.otpValidUntil = Date.now() + timeLeft;
        if (!this.editing) {
            this.render();
        }
        if (this.otpValue && timeLeft) {
            this.otpTimeout = setTimeout(() => {
                this.requestOtpUpdate();
                if (this.otpTickInterval) {
                    clearInterval(this.otpTickInterval);
                    this.otpTickInterval = null;
                }
                if (this.model.needsTouch) {
                    this.fieldOpacity = null;
                    this.otpValue = null;
                    this.otpValidUntil = 0;
                    this.otpTimeLeft = 0;
                    this.valueEl.css('opacity', 1);
                }
                this.render();
            }, timeLeft);
            if (!this.otpTickInterval) {
                this.otpTickInterval = setInterval(this.otpTick.bind(this), 300);
            }
        }
    }

    otpTick() {
        if (!this.value || !this.otpValidUntil) {
            return;
        }
        let opacity;
        const timeLeft = this.otpValidUntil - Date.now();
        if (timeLeft >= Timeouts.OtpFadeDuration || this.editing) {
            opacity = 1;
        } else if (timeLeft <= 0) {
            opacity = MinOpacity;
        } else {
            opacity = Math.max(MinOpacity, Math.pow(timeLeft / Timeouts.OtpFadeDuration, 2));
        }
        if (this.fieldOpacity === opacity) {
            return;
        }
        this.fieldOpacity = opacity;
        this.valueEl.css('opacity', opacity);
    }

    copyValue() {
        this.refreshOtp((err) => {
            if (!err) {
                super.copyValue();
            }
        });
    }

    refreshOtp(callback) {
        if (this.model.needsTouch) {
            if (this.otpValue) {
                callback();
            } else {
                this.requestTouch(callback);
            }
        } else {
            callback();
        }
    }

    requestTouch(callback) {
        this.otpState = 'awaiting-touch';
        this.value.next((err, code, timeLeft) => {
            this.otpUpdated(err, code, timeLeft);
            callback(err);
        });
        this.render();
    }

    stopOtpUpdater() {
        if (this.otpState === 'awaiting-touch') {
            if (this.value && this.value.cancel) {
                this.value.cancel();
            }
        }
        this.resetOtp();
    }
}

export { FieldViewOtp };
