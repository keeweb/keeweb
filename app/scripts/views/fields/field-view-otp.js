const FieldViewText = require('./field-view-text');
const Timeouts = require('../../const/timeouts');

const MinOpacity = 0.1;

const FieldViewOtp = FieldViewText.extend({
    otpTimeout: null,
    otpTickInterval: null,
    otpValue: null,
    otpGenerator: null,
    otpTimeLeft: 0,
    otpValidUntil: 0,
    fieldOpacity: null,

    renderValue: function(value) {
        if (!value) {
            this.resetOtp();
            return '';
        }
        if (value !== this.otpGenerator) {
            this.otpGenerator = value;
            this.requestOtpUpdate();
        }
        return this.otpValue;
    },

    getEditValue: function(value) {
        return value && value.url;
    },

    render: function() {
        FieldViewText.prototype.render.call(this);
        this.fieldOpacity = null;
        this.otpTick();
    },

    remove: function() {
        this.resetOtp();
        FieldViewText.prototype.remove.apply(this, arguments);
    },

    resetOtp: function() {
        this.otpGenerator = null;
        this.otpValue = null;
        this.otpTimeLeft = 0;
        this.otpValidUntil = 0;
        if (this.otpTimeout) {
            clearTimeout(this.otpTimeout);
            this.otpTimeout = null;
        }
        if (this.otpTickInterval) {
            clearInterval(this.otpTickInterval);
            this.otpTickInterval = null;
        }
    },

    requestOtpUpdate: function() {
        if (this.value) {
            this.value.next(this.otpUpdated.bind(this));
        }
    },

    otpUpdated: function(pass, timeLeft) {
        if (!this.value || !pass) {
            this.resetOtp();
            return;
        }
        this.otpValue = pass || '';
        this.otpTimeLeft = timeLeft || 0;
        this.otpValidUntil = Date.now() + timeLeft;
        if (!this.editing) {
            this.render();
        }
        if (this.otpValue && timeLeft) {
            this.otpTimeout = setTimeout(this.requestOtpUpdate.bind(this), timeLeft);
            if (!this.otpTickInterval) {
                this.otpTickInterval = setInterval(this.otpTick.bind(this), 300);
            }
        }
    },

    otpTick: function() {
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
});

module.exports = FieldViewOtp;
