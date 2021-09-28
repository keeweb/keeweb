import * as kdbxweb from 'kdbxweb';

const ExpectedFieldRefChars = '{REF:0@I:00000000000000000000000000000000}'.split('');
const ExpectedFieldRefByteLength = ExpectedFieldRefChars.length;

kdbxweb.ProtectedValue.prototype.isProtected = true;

kdbxweb.ProtectedValue.prototype.forEachChar = function (fn) {
    const value = this.value;
    const salt = this.salt;
    let b, b1, b2, b3;
    for (let i = 0, len = value.length; i < len; i++) {
        b = value[i] ^ salt[i];
        if (b < 128) {
            if (fn(b) === false) {
                return;
            }
            continue;
        }
        i++;
        b1 = value[i] ^ salt[i];
        if (i === len) {
            break;
        }
        if (b >= 192 && b < 224) {
            if (fn(((b & 0x1f) << 6) | (b1 & 0x3f)) === false) {
                return;
            }
            continue;
        }
        i++;
        b2 = value[i] ^ salt[i];
        if (i === len) {
            break;
        }
        if (b >= 224 && b < 240) {
            if (fn(((b & 0xf) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f)) === false) {
                return;
            }
        }
        i++;
        b3 = value[i] ^ salt[i];
        if (i === len) {
            break;
        }
        if (b >= 240 && b < 248) {
            let c = ((b & 7) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
            if (c <= 0xffff) {
                if (fn(c) === false) {
                    return;
                }
            } else {
                c ^= 0x10000;
                if (fn(0xd800 | (c >> 10)) === false) {
                    return;
                }
                if (fn(0xdc00 | (c & 0x3ff)) === false) {
                    return;
                }
            }
        }
        // skip error
    }
};

Object.defineProperty(kdbxweb.ProtectedValue.prototype, 'length', {
    get() {
        return this.textLength;
    }
});

Object.defineProperty(kdbxweb.ProtectedValue.prototype, 'textLength', {
    get() {
        let textLength = 0;
        this.forEachChar(() => {
            textLength++;
        });
        return textLength;
    }
});

kdbxweb.ProtectedValue.prototype.includesLower = function (findLower) {
    return this.indexOfLower(findLower) !== -1;
};

kdbxweb.ProtectedValue.prototype.indexOfLower = function (findLower) {
    let index = -1;
    const foundSeqs = [];
    const len = findLower.length;
    let chIndex = -1;
    this.forEachChar((ch) => {
        chIndex++;
        ch = String.fromCharCode(ch).toLowerCase();
        if (index !== -1) {
            return;
        }
        for (let i = 0; i < foundSeqs.length; i++) {
            const seqIx = ++foundSeqs[i];
            if (findLower[seqIx] !== ch) {
                foundSeqs.splice(i, 1);
                i--;
                continue;
            }
            if (seqIx === len - 1) {
                index = chIndex - len + 1;
                return;
            }
        }
        if (findLower[0] === ch) {
            if (len === 1) {
                index = chIndex - len + 1;
            } else {
                foundSeqs.push(0);
            }
        }
    });
    return index;
};

kdbxweb.ProtectedValue.prototype.indexOfSelfInLower = function (targetLower) {
    let firstCharIndex = -1;
    let found = false;
    do {
        let chIndex = -1;
        this.forEachChar((ch) => {
            chIndex++;
            ch = String.fromCharCode(ch).toLowerCase();
            if (chIndex === 0) {
                firstCharIndex = targetLower.indexOf(ch, firstCharIndex + 1);
                found = firstCharIndex !== -1;
                return;
            }
            if (!found) {
                return;
            }
            found = targetLower[firstCharIndex + chIndex] === ch;
        });
    } while (!found && firstCharIndex >= 0);
    return firstCharIndex;
};

kdbxweb.ProtectedValue.prototype.equals = function (other) {
    if (!other) {
        return false;
    }
    if (!other.isProtected) {
        return this.textLength === other.length && this.includes(other);
    }
    if (other === this) {
        return true;
    }
    const len = this.byteLength;
    if (len !== other.byteLength) {
        return false;
    }
    for (let i = 0; i < len; i++) {
        if ((this.value[i] ^ this.salt[i]) !== (other.value[i] ^ other.salt[i])) {
            return false;
        }
    }
    return true;
};

kdbxweb.ProtectedValue.prototype.isFieldReference = function () {
    if (this.byteLength !== ExpectedFieldRefByteLength) {
        return false;
    }
    let ix = 0;
    this.forEachChar((ch) => {
        const expected = ExpectedFieldRefChars[ix++];
        if (expected !== '0' && ch !== expected) {
            return false;
        }
    });
    return true;
};

const RandomSalt = kdbxweb.CryptoEngine.random(128);

kdbxweb.ProtectedValue.prototype.saltedValue = function () {
    if (!this.byteLength) {
        return 0;
    }
    const value = this.value;
    const salt = this.salt;
    let salted = '';
    for (let i = 0, len = value.length; i < len; i++) {
        const byte = value[i] ^ salt[i];
        salted += String.fromCharCode(byte ^ RandomSalt[i % RandomSalt.length]);
    }
    return salted;
};

kdbxweb.ProtectedValue.prototype.dataAndSalt = function () {
    return {
        data: [...this.value],
        salt: [...this.salt]
    };
};

kdbxweb.ProtectedValue.prototype.toBase64 = function () {
    const binary = this.getBinary();
    const base64 = kdbxweb.ByteUtils.bytesToBase64(binary);
    kdbxweb.ByteUtils.zeroBuffer(binary);
    return base64;
};

kdbxweb.ProtectedValue.fromBase64 = function (base64) {
    const bytes = kdbxweb.ByteUtils.base64ToBytes(base64);
    return kdbxweb.ProtectedValue.fromBinary(bytes);
};
