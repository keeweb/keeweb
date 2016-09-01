'use strict';

var Logger = require('./logger');

var logger = new Logger('otp');

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

    this.key = Otp.fromBase32(this.secret);
    if (!this.key) {
        throw 'Bad key: ' + this.key;
    }
};

Otp.prototype.next = function(callback) {
    var valueForHashing;
    var timeLeft;
    if (this.type === 'totp') {
        var now = Date.now();
        var epoch = Math.round(now / 1000);
        valueForHashing = Math.floor(epoch / this.period);
        var msPeriod = this.period * 1000;
        timeLeft = msPeriod - (now % msPeriod);
    } else {
        valueForHashing = this.counter;
    }
    var data = new Uint8Array(8).buffer;
    new DataView(data).setUint32(4, valueForHashing);
    this.hmac(data, (sig, err) => {
        if (!sig) {
            logger.error('OTP calculation error', err);
            return callback();
        }
        sig = new DataView(sig);
        var offset = sig.getInt8(sig.byteLength - 1) & 0xf;
        var pass = (sig.getUint32(offset) & 0x7fffffff).toString();
        pass = Otp.leftPad(pass.substr(pass.length - this.digits), this.digits);
        callback(pass, timeLeft);
    });
};

Otp.prototype.hmac = function(data, callback) {
    if (!window.crypto && window.msCrypto) {
        return this.hmacMsCrypto(data, callback);
    }
    var subtle = window.crypto.subtle || window.crypto.webkitSubtle;
    var algo = { name: 'HMAC', hash: { name: this.algorithm.replace('SHA', 'SHA-') } };
    subtle.importKey('raw', this.key, algo, false, ['sign'])
        .then(key => {
            subtle.sign(algo, key, data)
                .then(sig => { callback(sig); })
                .catch(err => { callback(null, err); });
        })
        .catch(err => { callback(null, err); });
};

Otp.prototype.hmacMsCrypto = function(data, callback) {
    var subtle = window.msCrypto.subtle;
    var algo = { name: 'HMAC', hash: { name: this.algorithm.replace('SHA', 'SHA-') } };
    subtle.importKey('raw', this.key, algo, false, ['sign']).oncomplete = function(e) {
        var key = e.target.result;
        subtle.sign(algo, key, data).oncomplete = function(e) {
            var sig = e.target.result;
            callback(sig);
        };
    };
};

Otp.fromBase32 = function(str) {
    var alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
    var bin = '';
    var i;
    for (i = 0; i < str.length; i++) {
        var ix = alphabet.indexOf(str[i].toLowerCase());
        if (ix < 0) {
            return null;
        }
        bin += Otp.leftPad(ix.toString(2), 5);
    }
    var hex = new Uint8Array(Math.floor(bin.length / 8));
    for (i = 0; i < hex.length; i++) {
        var chunk = bin.substr(i * 8, 8);
        hex[i] = parseInt(chunk, 2);
    }
    return hex.buffer;
};

Otp.leftPad = function(str, len) {
    while (str.length < len) {
        str = '0' + str;
    }
    return str;
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
    match[3].split('&').forEach(part => {
        var parts = part.split('=', 2);
        params[parts[0].toLowerCase()] = decodeURIComponent(parts[1]);
    });
    return new Otp(url, params);
};

Otp.isSecret = function(str) {
    return !!Otp.fromBase32(str);
};

Otp.makeUrl = function(secret, period, digits) {
    return 'otpauth://totp/default?secret=' + secret + (period ? '&period=' + period : '') + (digits ? '&digits=' + digits : '');
};

module.exports = Otp;
