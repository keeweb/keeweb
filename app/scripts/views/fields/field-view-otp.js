'use strict';

var FieldViewText = require('./field-view-text');

var FieldViewOtp = FieldViewText.extend({
    otpTimeout: null,
    otpValue: null,
    otpGenerator: null,

    renderValue: function(value) {
        this.resetOtpTimer();
        if (!value) {
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

    remove: function() {
        this.resetOtpTimer();
        this.value = null;
        this.otpGenerator = null;
        FieldViewText.prototype.remove.apply(this, arguments);
    },

    resetOtpTimer: function() {
        if (this.otpTimeout) {
            clearTimeout(this.otpTimeout);
        }
    },

    requestOtpUpdate: function() {
        if (this.value) {
            this.value.next(this.otpUpdated.bind(this));
        }
    },

    otpUpdated: function(pass, timeLeft) {
        if (!this.value) {
            return;
        }
        this.otpValue = pass || '';
        this.render();
        if (this.otpValue && timeLeft) {
            this.otpTimeout = setTimeout(this.requestOtpUpdate.bind(this), timeLeft);
        }
    }
});

module.exports = FieldViewOtp;
