'use strict';

var Otp = function(url, params) {
    if (['hotp', 'totp'].indexOf(params.type) < 0) {
        throw 'Bad type: ' + params.type;
    }
    if (!params.secret) {
        throw 'Empty secret';
    }
    if (params.algorithm && ['SHA1', 'SHA256', 'SHA512'].indexOf(params.algorithm) < 0) {
        throw 'Bad algorithm: ' + params.algorithm;
    }
    if (params.digits && ['6', '8'].indexOf(params.digits) < 0) {
        throw 'Bad digits: ' + params.digits;
    }
    if (params.type === 'hotp' && !params.counter) {
        throw 'Bad counter: ' + params.counter;
    }
    if (params.period && isNaN(params.period) || params.period < 1) {
        throw 'Bad period: ' + params.period;
    }
    this.url = url;
    this.type = params.type;
    this.issuer = params.issuer;
    this.account = params.account;
    this.secret = params.secret;
    this.issuer = params.issuer;
    this.algorithm = params.algorithm ? params.algorithm.toUpperCase() : 'SHA1';
    this.digits = params.digits ? +params.digits : 6;
    this.counter = params.counter;
    this.period = params.period ? +params.period : 30;
};

Otp.parseUrl = function(url) {
    var match = /^otpauth:\/\/(\w+)\/([^\?]+)\?(.*)/i.exec(url);
    if (!match) {
        throw 'Not OTP url';
    }
    var params = {};
    var label = decodeURIComponent(match[2]);
    if (label) {
        var parts = label.split(':');
        params.issuer = parts[0].trim();
        if (parts.length > 1) {
            params.account = parts[1].trim();
        }
    }
    params.type = match[1].toLowerCase();
    match[3].split('&').forEach(function(part) {
        var parts = part.split('=', 2);
        params[parts[0].toLowerCase()] = decodeURIComponent(parts[1]);
    });
    return new Otp(url, params);
};

module.exports = Otp;
