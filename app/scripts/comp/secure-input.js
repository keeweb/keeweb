'use strict';

var kdbxweb = require('kdbxweb');

var SecureInput = function() {
    this.el = null;
    this.minChar = 0x1400 + Math.round(Math.random() * 100);
    this.maxLen = 128;
    this.length = 0;
    this.pseudoValue = '';
    this.salt = new Uint32Array(0);
};

SecureInput.prototype.setElement = function(el) {
    this.el = el;
    this.el.val(this.pseudoValue);
    this.el.on('input', this._input.bind(this));
};

SecureInput.prototype.reset = function() {
    this.el = null;
    this.length = 0;
    this.pseudoValue = '';

    if (this.salt) {
        for (var i = 0; i < this.salt.length; i++) {
            this.salt[i] = 0;
        }
    }
    this.salt = new Uint32Array(0);
};

SecureInput.prototype._input = function() {
    var selStart = this.el[0].selectionStart;
    var value = this.el.val();
    var newPs = '',
        newSalt = new Uint32Array(this.maxLen);
    var valIx = 0, psIx = 0;
    while (valIx < value.length) {
        var valCh = value.charCodeAt(valIx),
            psCh = this.pseudoValue.charCodeAt(psIx),
            isSpecial = this._isSpecialChar(valCh);
        if (psCh === valCh) {
            // not changed
            newPs += this._getChar(newPs.length);
            newSalt[newPs.length - 1] = psCh ^ this.salt[psIx] ^ newPs.charCodeAt(newPs.length - 1);
            psIx++;
            valIx++;
        } else if (isSpecial) {
            // deleted
            psIx++;
        } else {
            // inserted or replaced
            newPs += this._getChar(newPs.length);
            newSalt[newPs.length - 1] = newPs.charCodeAt(newPs.length - 1) ^ valCh;
            valIx++;
        }
    }
    this.length = newPs.length;
    this.pseudoValue = newPs;
    this.salt = newSalt;
    this.el.val(newPs);
    this.el[0].selectionStart = selStart;
    this.el[0].selectionEnd = selStart;
};

SecureInput.prototype._getChar = function(ix) {
    return String.fromCharCode(this.minChar + ix);
};

SecureInput.prototype._isSpecialChar = function(ch) {
    return ch >= this.minChar && ch <= this.minChar + this.maxLen;
};

Object.defineProperty(SecureInput.prototype, 'value', {
    enumerable: true,
    get: function() {
        var pseudoValue = this.pseudoValue,
            salt = this.salt,
            len = pseudoValue.length,
            byteLength = 0,
            valueBytes = new Uint8Array(len * 4),
            saltBytes = kdbxweb.Random.getBytes(len * 4),
            ch, bytes;
        for (var i = 0; i < len; i++) {
            ch = String.fromCharCode(pseudoValue.charCodeAt(i) ^ salt[i]);
            bytes = kdbxweb.ByteUtils.stringToBytes(ch);
            for (var j = 0; j < bytes.length; j++) {
                valueBytes[byteLength] = bytes[j] ^ saltBytes[byteLength];
                byteLength++;
            }
        }
        return new kdbxweb.ProtectedValue(valueBytes.buffer.slice(0, byteLength), saltBytes.buffer.slice(0, byteLength));
    }
});

module.exports = SecureInput;
