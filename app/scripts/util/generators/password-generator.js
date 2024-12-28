import * as kdbxweb from 'kdbxweb';
import { phonetic } from 'util/generators/phonetic';
import { shuffle } from 'util/fn';
import { AppSettingsModel } from 'models/app-settings-model';
import {} from 'crypto';

/*
    Char ranges. each letter treated individually
*/

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
        const bIncAllowUpper = opts.include && opts.include.length && opts.upper; // allows for using uppercase checkboxes for presets
        const bIncAllowLower = opts.include && opts.include.length && opts.lower; // allows for using lowercase checkboxes for presets

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

        /*
            used if action specifies custom opts.include.

            delete all CharRanges

            used for presets like hashes since we need to keep the list
            of opts.include chars but also allow for selecting upper / lowercase checkboxes
        */

        if (bIncAllowUpper || bIncAllowLower) {
            if (bIncAllowUpper && opts.include) {
                opts.include = opts.include.toUpperCase();
            } else if (bIncAllowLower && opts.include) {
                opts.include = opts.include.toLowerCase();
            }
        }

        /*
            Compiles a list of characters to be available and assigned to `ranges` from global list `CharRanges`
            opts get copied to

            CharRanges      list of all presets available to use
                                ambiguous: "O0oIl"
                                brackets: "(){}[]<>"
                                digits: "123456789"
                                high: "¡¢£¤¥¦§©ª«¬®¯°±²³´µ¶¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ"
                                lower: "abcdefghijkmnpqrstuvwxyz"
                                spaces: " "
                                special: "!@#$%^&*_+-=,./?;:`\"~'\\"
                                upper: "ABCDEFGHJKLMNPQRSTUVWXYZ"

            ranges          list of presets allowed for generation (what is selected as checkboxes)
                                0: "ABCDEFGHJKLMNPQRSTUVWXYZ"
                                1: "abcdefghijkmnpqrstuvwxyz"
                                2: "123456789"
        */

        let ranges = Object.keys(CharRanges)
            .filter((r) => {
                /*
                    list of all CharRanges available for user to check (both checked and unchecked)

                    r               each option filtered through
                                    `upper, lower, digits, special, brackets, high, ambiguous, spaces`

                    opts[r]         returns `undefined` if checkbox for CharRange not checked
                                    returns `true` if checkbox for CharRange is checked
                */

                return opts[r];
            })
            .map((r) => {
                /*
                    list of ranges that were checked by user in checkbox

                    r               each option filtered through
                                    `upper, lower, digits, special, brackets, high, ambiguous, spaces`

                    CharRanges[r]   returns string with characters in range that were checked
                                    `ABCDEFGHJKLMNPQRSTUVWXYZ`
                                    `abcdefghijkmnpqrstuvwxyz`
                                    `123456789`
                                    `!@#$%^&*_+-=,./?;:`"~'\`
                */

                return CharRanges[r];
            });

        /*
            If present has custom defined range of characters (opts.include) specified; use
                the include chars instead and set original ranges to empty.
            opts.include allows for a restricted group of characters to be used in generation

            defined in
                app/scripts/comp/app/generator-presets.js

                hash128         0123456789abcdef
                hash256         0123456789abcdef
        */

        if (bIncAllowUpper || bIncAllowLower) {
            ranges = [];
        }

        /*
            Loops ranges, returns object's own enumerable string-keyed property names.

            itemKey/r       numerical key           0
            item            key's property          ABCDEFGHJKLMNPQRSTUVWXYZ
        */

        Object.keys(ranges).forEach((r) => {
            const itemKey = r;
            const item = ranges[itemKey];

            /*
                `item` returns entire range of character sets
                    abcdefghijkmnpqrstuvwxyz
                    ABCDEFGHJKLMNPQRSTUVWXYZ
                    123456789

                Since we have a `space ` in our list of CharRange, js won't accept a space as a value, and
                we don't want it anyway, as spaces would be added at random, at the beginning or end of
                string, and sometimes 2 or 3 in a row.

                if we left the space in as a CharRange option, it would look like the following
                (without a proper value), 4 values / 3 keys

                    Array(4) [ "ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "123456789", " " ]
                        0: "ABCDEFGHJKLMNPQRSTUVWXYZ"
                        1: "abcdefghijkmnpqrstuvwxyz"
                        2: "123456789"

                we are going to use logic later to randomize spaces added to a password, so that they are not at
                the beginning / end or bunched

                ranges.pop removes the `space ` character from the ranges list.

                String.fromCharCode(32)     =   ' ' (space character)
            */

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

        const rangeIxRandBytes = kdbxweb.CryptoEngine.random(countDefaultChars);
        const rangeCharRandBytes = kdbxweb.CryptoEngine.random(countDefaultChars);
        const randomBytes = kdbxweb.CryptoEngine.random(opts.length);
        const defaultRangeGeneratedChars = [];
        for (let i = 0; i < countDefaultChars; i++) {
            const rangeIx = i < ranges.length ? i : rangeIxRandBytes[i] % ranges.length;
            const range = ranges[rangeIx];
            const char = range[rangeCharRandBytes[i] % range.length];
            defaultRangeGeneratedChars.push(char);
        }

        /*
            shuffle array with each character to be in pass
                Array(16) [ "e", "x", "x", "2", "9", "a", "9", "5", "Y", "A", … ]
        */

        shuffle(defaultRangeGeneratedChars);

        const chars = [];
        const pwdLenReq = opts.length;
        let pwdLenNow = 1;
        let pwdCharLast = null;
        let pwdMarginSp = Math.round(pwdLenReq * Math.random());
        if (pwdMarginSp === pwdLenReq) {
            pwdMarginSp -= 1;
        }

        /*
            numerically loop through the total num of chars our password must have defined by `pwdLenReq`
        */

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
                    const randBytes = new Uint8Array(1);
                    global.crypto.getRandomValues(randBytes);
                    const randChance = (randBytes / 255) % 255;
                    if (randChance < 0.1 || (pwdLenNow >= pwdMarginSp && !bAlreadyHasSpace)) {
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
                    if (opts.separator) {
                        p = p + AppSettingsModel.generatorWordSeparator + '-';
                    } else {
                        p = p + AppSettingsModel.generatorWordSeparator + '-';
                    }
                }
            }

            if (i < pass.length - 1 && opts.separator) {
                p = p + AppSettingsModel.generatorWordSeparator;
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
