import * as kdbxweb from 'kdbxweb';
import { phonetic } from 'util/generators/phonetic';
import { shuffle } from 'util/fn';

const CharRanges = {
    upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
    lower: 'abcdefghijkmnpqrstuvwxyz',
    digits: '123456789',
    special: '!@#$%^&*_+-=,./?;:`"~\'\\',
    brackets: '(){}[]<>',
    high:
        '¡¢£¤¥¦§©ª«¬®¯°±²³´µ¶¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ',
    ambiguous: 'O0oIl'
};

const DefaultCharRangesByPattern = {
    'A': CharRanges.upper,
    'a': CharRanges.lower,
    '1': CharRanges.digits,
    '*': CharRanges.special,
    '[': CharRanges.brackets,
    'Ä': CharRanges.high,
    '0': CharRanges.ambiguous
};

const PasswordGenerator = {
    generate(opts) {
        if (!opts || typeof opts.length !== 'number' || opts.length < 0) {
            return '';
        }
        if (opts.name === 'Pronounceable') {
            return this.generatePronounceable(opts);
        }
        const ranges = Object.keys(CharRanges)
            .filter((r) => opts[r])
            .map((r) => CharRanges[r]);
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
        const defaultRangeGeneratedChars = [];
        for (let i = 0; i < countDefaultChars; i++) {
            const rangeIx = i < ranges.length ? i : rangeIxRandomBytes[i] % ranges.length;
            const range = ranges[rangeIx];
            const char = range[rangeCharRandomBytes[i] % range.length];
            defaultRangeGeneratedChars.push(char);
        }
        shuffle(defaultRangeGeneratedChars);

        const randomBytes = kdbxweb.CryptoEngine.random(opts.length);
        const chars = [];
        for (let i = 0; i < opts.length; i++) {
            const rand = Math.round(Math.random() * 1000) + randomBytes[i];
            const patternChar = pattern[i % pattern.length];
            if (patternChar === 'X') {
                chars.push(defaultRangeGeneratedChars.pop());
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
        return result.substr(0, opts.length);
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
