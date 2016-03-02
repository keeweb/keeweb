'use strict';

var kdbxweb = require('kdbxweb');

var PasswordGenerator = {
    charRanges: {
        upper: { left:'ABCDEFGHJKLM', right:'NPQRSTUVWXYZ' },
        lower: { left:'abcdefghijkm', right:'npqrstuvwxyz' },
        digits: { left:'12345', right:'6789' },
        special: { left: '`~!@#$%', right:'^&*_+-=,./?;:`"~\'\\' },
        brackets: { left:'(){}[]<>' },
        high: '¡¢£¤¥¦§©ª«¬®¯°±²³´µ¶¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ',
        ambiguous: 'O0oIl'
    },
    generate: function(opts) {
        if (!opts || typeof opts.length !== 'number' || opts.length < 0) {
            return '';
        }
        var isRight = opts.right; var isLeft = opts.left;

        var ranges = Object.keys(this.charRanges)
            .filter(function(r) { return opts[r]; })
            .map(function(r) {
                if (r === 'high' || r ==='ambiguous') { return this.charRanges[r]; }
                else if (isRight && isLeft) { return this.charRanges[r].right.concat(this.charRanges[r].left); }
                else if (isRight) { return this.charRanges[r].right; }
                else if (isLeft) { return this.charRanges[r].left; }
                return this.charRanges[r];
                }, this);

        if (!ranges.length) {
            return '';
        }
        var randomBytes = kdbxweb.Random.getBytes(opts.length);
        var chars = [];
        for (var i = 0; i < opts.length; i++) {
            var range = ranges[i % ranges.length];
            var rand = Math.round(Math.random() * 1000) + randomBytes[i];
            chars.push(range[rand % range.length]);
        }
        return _.shuffle(chars).join('');
    },
    present: function(length) {
        return new Array(length + 1).join('•');
    }
};

module.exports = PasswordGenerator;
