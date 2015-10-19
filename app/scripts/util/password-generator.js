'use strict';

var kdbxweb = require('kdbxweb');

var PasswordGenerator = {
    charRanges: {
        upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
        lower: 'abcdefghijkmnpqrstuvwxyz',
        digits: '23456789',
        special: '!@#$%^&*_+-=,./?;:`"~\'\\',
        brackets: '()[]<>',
        high: '¡¢£¤¥¦§©ª«¬®¯°±²³´µ¶¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ',
        ambiguous: 'O0oIl1'
    },
    generate: function(opts) {
        if (!opts || typeof opts.length !== 'number' || opts.length < 0) {
            return '';
        }
        var pass = '';
        var ranges = Object.keys(this.charRanges)
            .filter(function(r) { return opts[r]; })
            .map(function(r) { return this.charRanges[r]; }, this);
        if (!ranges.length) {
            return '';
        }
        var randomBytes = kdbxweb.Random.getBytes(opts.length * 2);
        var pos = 0;
        while (pass.length < opts.length) {
            var rangeNum = randomBytes[pos++] % ranges.length;
            var range = ranges[rangeNum];
            pass += range[randomBytes[pos++] % range.length];
        }
        return pass;
    }
};

module.exports = PasswordGenerator;
