'use strict';

var kdbxweb = require('kdbxweb');

kdbxweb.ProtectedValue.prototype.isProtected = true;

kdbxweb.ProtectedValue.prototype.forEachChar = function(fn) {
    var value = this._value, salt = this._salt;
    var b, b1, b2, b3;
    for (var i = 0, len = value.length; i < len; i++) {
        b = value[i] ^ salt[i];
        if (b < 128) {
            fn(b);
            continue;
        }
        i++; b1 = value[i] ^ salt[i];
        if (i === len) { break; }
        if (b >= 192 && b < 224) {
            fn(((b & 0x1f) << 6) | (b1 & 0x3f));
            continue;
        }
        i++; b2 = value[i] ^ salt[i];
        if (i === len) { break; }
        if (b >= 224 && b < 240) {
            fn(((b & 0xf) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
        }
        i++; b3 = value[i] ^ salt[i];
        if (i === len) { break; }
        if (b >= 240 && b < 248) {
            var c = ((b & 7) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
            if (c <= 0xffff) {
                fn(c);
            } else {
                c ^= 0x10000;
                fn(0xd800 | (c >> 10));
                fn(0xdc00 | (c & 0x3ff));
            }
        }
        // skip error
    }
};

Object.defineProperty(kdbxweb.ProtectedValue.prototype, 'textLength', {
    get: function() {
        var textLength = 0;
        this.forEachChar(function() { textLength++; });
        return textLength;
    }
});

kdbxweb.ProtectedValue.prototype.includesLower = function(findLower) {
    var matches = false;
    var foundSeqs = [];
    var ix = 0;
    var len = findLower.length;
    this.forEachChar(function(ch) {
        ch = String.fromCharCode(ch).toLowerCase();
        if (matches) {
            return;
        }
        for (var i = 0; i < foundSeqs.length; i++) {
            var seqIx = ++foundSeqs[i];
            if (findLower[seqIx] !== ch) {
                foundSeqs.splice(i, 1);
                i--;
                continue;
            }
            if (seqIx === len - 1) {
                matches = true;
                return;
            }
        }
        if (findLower[0] === ch) {
            foundSeqs.push(0);
        }
        ix++;
    });
    return matches;
};

kdbxweb.ProtectedValue.prototype.equals = function(other) {
    if (!other) {
        return false;
    }
    if (!other.isProtected) {
        return this.textLength === other.length && this.includes(other);
    }
    if (other === this) {
        return true;
    }
    var len = this.byteLength;
    if (len !== other.byteLength) {
        return false;
    }
    for (var i = 0; i < len; i++) {
        if ((this._value[i] ^ this._salt[i]) !== (other._value[i] ^ other._salt[i])) {
            return false;
        }
    }
    return true;
};

module.exports = kdbxweb.ProtectedValue;
