import * as kdbxweb from 'kdbxweb';
import { phonetic } from 'util/generators/phonetic';
import { shuffle } from 'util/fn';
import {} from 'crypto';

const CharRanges = {
    upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
    lower: 'abcdefghijkmnpqrstuvwxyz',
    digits: '123456789',
    special: '!@#$%^&*_+-=,./?;:`"~\'\\',
    brackets: '(){}[]<>',
    high: '¡¢£¤¥¦§©ª«¬®¯°±²³´µ¶¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ',
    ambiguous: 'O0oIl',
    spaces: ' '
};

const DefaultCharRangesByPattern = {
    'A': CharRanges.upper,
    'a': CharRanges.lower,
    '1': CharRanges.digits,
    '*': CharRanges.special,
    '[': CharRanges.brackets,
    'Ä': CharRanges.high,
    '0': CharRanges.ambiguous,
    'S': CharRanges.spaces
};

const PasswordGenerator = {
    generate(opts) {
        const bUseSpaces = opts.spaces;
        const bUpperInc = opts.include && opts.include.length && opts.upper; // allows for using uppercase checkboxes for presets
        const bLowerInc = opts.include && opts.include.length && opts.lower; // allows for using lowercase checkboxes for presets

        if (!opts || typeof opts.length !== 'number' || opts.length < 0) {
            return '';
        }

        if (opts.name && opts.name.toLowerCase() === 'uuid') {
            return this.generateUUIDv4(opts);
        }

        if (opts.name && opts.name.toLowerCase() === 'passphrase') {
            return this.generatePassphrase(opts);
        }

        if (opts.name && opts.name.toLowerCase() === 'pronounceable') {
            return this.generatePronounceable(opts);
        }

        // used if action specifies custom opts.include
        // delete all CharRanges
        // used for presets such as hashes since we need to keep the list of opts.include characters
        // but also allows for selecting upper and lowercase checkboxes
        if (bUpperInc || bLowerInc) {
            if (bUpperInc && opts.include) {
                opts.include = opts.include.toUpperCase();
            } else if (bLowerInc && opts.include) {
                opts.include = opts.include.toLowerCase();
            }
        }

        // returns string of characters to choose from
        let ranges = Object.keys(CharRanges)
            .filter((r) => {
                return opts[r];
            })
            .map((r) => {
                return CharRanges[r];
            });

        // delete ranges if opts.include specified, use the include characters instead
        if (bUpperInc || bLowerInc) {
            ranges = [];
        }

        Object.keys(ranges).forEach((r) => {
            const itemKey = r;
            const item = ranges[itemKey];

            if (item === String.fromCharCode(32)) {
                ranges.pop(r);
            }
        });

        if (opts.include && opts.include.length) {
            ranges.push(opts.include);
        }

        if (!ranges.length) {
            return '';
        }

        const rangesByPatternChar = {
            ...DefaultCharRangesByPattern,
            'I': opts.include || ''
        };

        const pattern = opts.pattern || 'X';

        let countDefaultChars = 0;
        for (let i = 0; i < opts.length; i++) {
            const patternChar = pattern[i % pattern.length];
            if (patternChar === 'X') {
                countDefaultChars++;
            }
        }

        const rangeIxRandomBytes = kdbxweb.CryptoEngine.random(countDefaultChars);
        const rangeCharRandomBytes = kdbxweb.CryptoEngine.random(countDefaultChars);
        const randomBytes = kdbxweb.CryptoEngine.random(opts.length);
        const defaultRangeGeneratedChars = [];
        for (let i = 0; i < countDefaultChars; i++) {
            const rangeIx = i < ranges.length ? i : rangeIxRandomBytes[i] % ranges.length;
            const range = ranges[rangeIx];
            const char = range[rangeCharRandomBytes[i] % range.length];
            defaultRangeGeneratedChars.push(char);
        }
        shuffle(defaultRangeGeneratedChars);

        const chars = [];
        const pwdLenReq = opts.length;
        let pwdLenNow = 1;
        let pwdCharLast = null;
        let pwdMarginSp = Math.round(pwdLenReq * Math.random());
        if (pwdMarginSp === pwdLenReq) {
            pwdMarginSp -= 1;
        }

        for (let i = 0; i < pwdLenReq; i++) {
            const rand = Math.round(Math.random() * 1000) + randomBytes[i];
            const patternChar = pattern[i % pattern.length];
            if (patternChar === 'X') {
                const bAlreadyHasSpace =
                    chars.find((element) => element === String.fromCharCode(32)) !== undefined;
                let char = defaultRangeGeneratedChars.pop();
                if (
                    bUseSpaces === true &&
                    pwdLenNow > 1 &&
                    pwdLenNow !== pwdLenReq &&
                    pwdCharLast !== String.fromCharCode(32)
                ) {
                    if (Math.random() < 0.1 || (pwdLenNow >= pwdMarginSp && !bAlreadyHasSpace)) {
                        char = String.fromCharCode(32);
                    }
                    chars.push(char);
                } else {
                    chars.push(char);
                }
                pwdLenNow += 1;
                pwdCharLast = char;
            } else {
                const range = rangesByPatternChar[patternChar];
                const char = range ? range[rand % range.length] : patternChar;
                chars.push(char);
            }
        }

        return chars.join('');
    },

    generatePronounceable(opts) {
        const pass = phonetic.generate({
            length: opts.length
        });
        let result = '';
        const upper = [];
        let i;
        if (opts.upper) {
            for (i = 0; i < pass.length; i += 8) {
                upper.push(Math.floor(Math.random() * opts.length));
            }
        }
        for (i = 0; i < pass.length; i++) {
            let ch = pass[i];
            if (upper.indexOf(i) >= 0) {
                ch = ch.toUpperCase();
            }
            result += ch;
        }

        return result.slice(0, opts.length);
    },

    // UUID v4 based on pure randomness, whereas v5 is derived from a string.
    // ASCII string with 8 hexadecimal digits followed by a hyphen
    // then three groups of 4 hexadecimal digits each followed by a hyphen
    // then 12 hexadecimal digits.
    // possibilities: 2^128

    generateUUIDv4(opts) {
        let p = '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
            (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
        );

        if (opts.lower && !opts.upper) {
            p = p.toLowerCase(); // lowercase
        } else if (opts.upper && !opts.lower) {
            p = p.toUpperCase(); // uppercase
        } else if (opts.upper && opts.lower) {
            p = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); // Mixed
        }

        return p;
    },

    generatePassphrase(opts) {
        const pass = phonetic.generate({
            length: opts.length
        });
        const passphraseList = require('../../wordlist/default.json');
        shuffle(passphraseList);

        let i;
        const spacer = '';
        const chars = [];
        for (i = 0; i < pass.length; i++) {
            const id = Math.floor(Math.random() * passphraseList.length);
            let p = passphraseList[id];
            passphraseList.splice(id, 1);

            if (opts.lower && !opts.upper) {
                p = p.toLowerCase(); // word1 word2
            } else if (opts.upper && !opts.lower) {
                p = p.toUpperCase(); // WORD1 WORD2
            } else if (opts.upper && opts.lower) {
                p = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); // Word1 Word2
            }

            if (opts.digits) {
                p = p + Math.floor(Math.random() * 10);
            }

            if (i < pass.length - 1) {
                if (opts.special) {
                    p = p + ',';
                } else if (opts.high) {
                    if (opts.spaces) {
                        p = p + ' -';
                    } else {
                        p = p + '-';
                    }
                }
            }

            if (i < pass.length - 1 && opts.spaces) {
                p = p + ' ';
            }

            chars.push(p);
        }

        return chars.join(spacer);
    },

    deriveOpts(password) {
        const opts = {};
        let length = 0;
        if (password) {
            const charRanges = CharRanges;
            password.forEachChar((ch) => {
                length++;
                ch = String.fromCharCode(ch);
                for (const [range, chars] of Object.entries(charRanges)) {
                    if (chars.indexOf(ch) >= 0) {
                        opts[range] = true;
                    }
                }
            });
        }
        opts.length = length;
        return opts;
    }
};

export { PasswordGenerator, CharRanges };
