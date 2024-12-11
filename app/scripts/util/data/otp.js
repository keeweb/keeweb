import { Logger } from 'util/logger';

const logger = new Logger('otp');

const Otp = function (url, params) {
    if (['hotp', 'totp'].indexOf(params.type.toLowerCase()) < 0) {
        throw 'Bad type: ' + params.type;
    }

    if (!params.secret) {
        throw 'Empty secret';
    }

    if (
        params.algorithm &&
        ['SHA1', 'SHA256', 'SHA512'].indexOf(params.algorithm.toUpperCase()) < 0
    ) {
        throw 'Bad algorithm: ' + params.algorithm;
    }

    if (params.digits && ['6', '7', '8'].indexOf(params.digits) < 0) {
        throw 'Bad digits: ' + params.digits;
    }

    if (params.type === 'hotp' && !params.counter) {
        throw 'Bad counter: ' + params.counter;
    }

    if ((params.period && Number.isNaN(params.period)) || params.period < 1) {
        throw 'Bad period: ' + params.period;
    }

    this.url = url;

    this.type = params.type.toLowerCase();
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

Otp.prototype.next = function (callback) {
    let valueForHashing;
    let timeLeft;
    if (this.type === 'totp') {
        const now = Date.now();
        const epoch = Math.round(now / 1000);
        valueForHashing = Math.floor(epoch / this.period);
        const msPeriod = this.period * 1000;
        timeLeft = msPeriod - (now % msPeriod);
    } else {
        valueForHashing = this.counter;
    }
    const data = new Uint8Array(8).buffer;
    new DataView(data).setUint32(4, valueForHashing);
    this.hmac(data, (sig, err) => {
        if (!sig) {
            logger.error('OTP calculation error', err);
            return callback(err);
        }
        sig = new DataView(sig);
        const offset = sig.getInt8(sig.byteLength - 1) & 0xf;
        const hmac = sig.getUint32(offset) & 0x7fffffff;
        let pass;
        if (this.issuer === 'Steam') {
            pass = Otp.hmacToSteamCode(hmac);
        } else {
            pass = Otp.hmacToDigits(hmac, this.digits);
        }
        callback(null, pass, timeLeft);
    });
};

Otp.prototype.hmac = function (data, callback) {
    const subtle = window.crypto.subtle || window.crypto.webkitSubtle;
    const algo = { name: 'HMAC', hash: { name: this.algorithm.replace('SHA', 'SHA-') } };
    subtle
        .importKey('raw', this.key, algo, false, ['sign'])
        .then((key) => {
            subtle
                .sign(algo, key, data)
                .then((sig) => {
                    callback(sig);
                })
                .catch((err) => {
                    callback(null, err);
                });
        })
        .catch((err) => {
            callback(null, err);
        });
};

Otp.hmacToDigits = function (hmac, length) {
    let code = hmac.toString();
    code = Otp.leftPad(code.slice(-length), length);
    return code;
};

Otp.hmacToSteamCode = function (hmac) {
    const steamChars = '23456789BCDFGHJKMNPQRTVWXY';
    let code = '';
    for (let i = 0; i < 5; ++i) {
        code += steamChars.charAt(hmac % steamChars.length);
        hmac /= steamChars.length;
    }
    return code;
};

Otp.fromBase32 = function (str) {
    str = str.replace(/\s/g, '');
    const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
    let bin = '';
    let i;
    for (i = 0; i < str.length; i++) {
        const ix = alphabet.indexOf(str[i].toLowerCase());
        if (ix < 0) {
            return null;
        }
        bin += Otp.leftPad(ix.toString(2), 5);
    }
    const hex = new Uint8Array(Math.floor(bin.length / 8));
    for (i = 0; i < hex.length; i++) {
        const chunk = bin.slice(i * 8, i * 8 + 8);
        hex[i] = parseInt(chunk, 2);
    }
    return hex.buffer;
};

Otp.leftPad = function (str, len) {
    while (str.length < len) {
        str = '0' + str;
    }
    return str;
};

Otp.parseUrl = function (url) {
    const match = /^otpauth:\/\/(\w+)\/([^\?]+)\?(.*)/i.exec(url);
    if (!match) {
        throw 'Not OTP url';
    }
    const params = {};
    const label = decodeURIComponent(match[2]);
    if (label) {
        const parts = label.split(':');
        params.issuer = parts[0].trim();
        if (parts.length > 1) {
            params.account = parts[1].trim();
        }
    }
    params.type = match[1].toLowerCase();
    match[3].split('&').forEach((part) => {
        const parts = part.split('=', 2);
        params[parts[0].toLowerCase()] = decodeURIComponent(parts[1]);
    });
    return new Otp(url, params);
};

Otp.isSecret = function (str) {
    return !!Otp.fromBase32(str);
};

Otp.makeUrl = function (secret, period, digits) {
    return (
        'otpauth://totp/default?secret=' +
        secret +
        (period ? '&period=' + period : '') +
        (digits ? '&digits=' + digits : '')
    );
};

export { Otp };
