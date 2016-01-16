'use strict';

var kdbxweb = require('kdbxweb');

kdbxweb.ProtectedValue.prototype.isProtected = true;

Object.defineProperty(kdbxweb.ProtectedValue.prototype, 'textLength', {
    get: function() {
        var textLength = 0;
        var value = this._value, salt = this._salt;
        for (var i = 0, len = value.length; i < len; i++) {
            var b = value[i] ^ salt[i];
            if (b < 128) {
                textLength++;
            } else if (b >= 192 && b < 224 && i+1 < len) {
                i++;
                textLength++;
            } else if (b >= 224 && b < 240 && i+2 < len) {
                i += 2;
                textLength++;
            } else if (b >= 240 && b < 248 && i+3 < len) {
                i++; var b1 = value[i] ^ salt[i];
                i++; var b2 = value[i] ^ salt[i];
                i++; var b3 = value[i] ^ salt[i];
                var c = ((b & 7) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
                if (c <= 0xffff) {
                    textLength++;
                } else {
                    textLength += 2;
                }
            } else {
                throw new Error('Malformed UTF8 character at byte offset ' + i);
            }
        }
        return textLength;
    }
});

module.exports = kdbxweb.ProtectedValue;
