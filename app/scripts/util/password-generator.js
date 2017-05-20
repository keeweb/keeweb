const kdbxweb = require('kdbxweb');
const phonetic = require('./phonetic');

const PasswordGenerator = {
    charRanges: {
        upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
        lower: 'abcdefghijkmnpqrstuvwxyz',
        digits: '123456789',
        special: '!@#$%^&*_+-=,./?;:`"~\'\\',
        brackets: '(){}[]<>',
        high: '¡¢£¤¥¦§©ª«¬®¯°±²³´µ¶¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ',
        ambiguous: 'O0oIl'
    },

    generate: function(opts) {
        if (!opts || typeof opts.length !== 'number' || opts.length < 0) {
            return '';
        }
        switch (opts.name) {
            case 'Pronounceable':
                return this.generatePronounceable(opts);
            case 'Hash128':
                return this.generateHash(32);
            case 'Hash256':
                return this.generateHash(64);
            case 'Mac':
                return this.generateMac();
        }
        const ranges = Object.keys(this.charRanges)
            .filter(r => opts[r])
            .map(function(r) { return this.charRanges[r]; }, this);
        if (opts.include && opts.include.length) {
            ranges.push(opts.include);
        }
        if (!ranges.length) {
            return '';
        }
        const randomBytes = kdbxweb.Random.getBytes(opts.length);
        const chars = [];
        for (let i = 0; i < opts.length; i++) {
            const range = ranges[i % ranges.length];
            const rand = Math.round(Math.random() * 1000) + randomBytes[i];
            chars.push(range[rand % range.length]);
        }
        return _.shuffle(chars).join('');
    },

    generateMac: function() {
        const segmentsCount = 6;
        const randomBytes = kdbxweb.Random.getBytes(segmentsCount);
        let result = '';
        for (let i = 0; i < segmentsCount; i++) {
            let segment = randomBytes[i].toString(16).toUpperCase();
            if (segment.length < 2) {
                segment = '0' + segment;
            }
            result += (result ? '-' : '') + segment;
        }
        return result;
    },

    generateHash: function(length) {
        const randomBytes = kdbxweb.Random.getBytes(length);
        let result = '';
        for (let i = 0; i < length; i++) {
            result += randomBytes[i].toString(16)[0];
        }
        return result;
    },

    generatePronounceable: function(opts) {
        const pass = phonetic.generate({
            length: opts.length,
            seed: this.generateHash(1024)
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

    deriveOpts: function(password) {
        const opts = {};
        let length = 0;
        if (password) {
            const charRanges = this.charRanges;
            password.forEachChar(ch => {
                length++;
                ch = String.fromCharCode(ch);
                _.forEach(charRanges, (chars, range) => {
                    if (chars.indexOf(ch) >= 0) {
                        opts[range] = true;
                    }
                });
            });
        }
        opts.length = length;
        return opts;
    },

    present: function(length) {
        return new Array(length + 1).join('•');
    }
};

module.exports = PasswordGenerator;
