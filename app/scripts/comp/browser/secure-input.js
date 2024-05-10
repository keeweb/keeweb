import * as kdbxweb from 'kdbxweb';

const SecureInput = function () {
    this.el = null;
    this.minChar = 0x1400 + Math.round(Math.random() * 100);
    this.maxLen = 1024;
    this.length = 0;
    this.pseudoValue = '';
    this.salt = new Uint32Array(0);
};

SecureInput.prototype.setElement = function (el, bRaw) {
    this.el = el;
    this.el.val(this.pseudoValue);
    this.el.on('input', this._input.bind(this, bRaw));
};

SecureInput.prototype.reset = function () {
    this.el = null;
    this.length = 0;
    this.pseudoValue = '';

    if (this.salt) {
        for (let i = 0; i < this.salt.length; i++) {
            this.salt[i] = 0;
        }
    }

    this.salt = new Uint32Array(0);
};

/*
    Replaces standard input textbox with a secure input
*/

SecureInput.prototype._input = function (bRaw) {
    const selStart = this.el[0].selectionStart;
    const value = this.el.val();
    let newPs = '';
    const newSalt = new Uint32Array(this.maxLen);
    let valIx = 0,
        psIx = 0;

    while (valIx < value.length) {
        const valCh = value.charCodeAt(valIx);
        const psCh = this.pseudoValue.charCodeAt(psIx);
        const isSpecial = this._isSpecialChar(valCh);

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
    this.el.val((bRaw && value) || newPs);
    this.el[0].selectionStart = selStart;
    this.el[0].selectionEnd = selStart;
};

SecureInput.prototype._getChar = function (ix) {
    return String.fromCharCode(this.minChar + ix);
};

SecureInput.prototype._isSpecialChar = function (ch) {
    return ch >= this.minChar && ch <= this.minChar + this.maxLen;
};

Object.defineProperty(SecureInput.prototype, 'value', {
    enumerable: true,
    get() {
        const pseudoValue = this.pseudoValue;
        const salt = this.salt;
        const len = pseudoValue.length;
        let byteLength = 0;
        const valueBytes = new Uint8Array(len * 4);
        const saltBytes = kdbxweb.CryptoEngine.random(len * 4);
        let ch;
        let bytes;
        for (let i = 0; i < len; i++) {
            const pseudoCharCode = pseudoValue.charCodeAt(i);
            ch = String.fromCharCode(salt[i] ^ pseudoCharCode);
            bytes = kdbxweb.ByteUtils.stringToBytes(ch);
            for (let j = 0; j < bytes.length; j++) {
                valueBytes[byteLength] = bytes[j] ^ saltBytes[byteLength];
                byteLength++;
            }
        }
        return new kdbxweb.ProtectedValue(
            valueBytes.buffer.slice(0, byteLength),
            saltBytes.buffer.slice(0, byteLength)
        );
    }
});

export { SecureInput };
