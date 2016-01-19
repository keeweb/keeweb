'use strict';

var Locale = require('./locale');

var Format = {
    pad: function(num, digits) {
        var str = num.toString();
        while (str.length < digits) {
            str = '0' + str;
        }
        return str;
    },
    dtStr: function(dt) {
        return dt ? this.dStr(dt) + ' ' + this.pad(dt.getHours(), 2) + ':' + this.pad(dt.getMinutes(), 2) +
            ':' + this.pad(dt.getSeconds(), 2) : '';
    },
    dStr: function(dt) {
        return dt ? dt.getDate() + ' ' + Locale.monthsShort[dt.getMonth()] + ' ' + dt.getFullYear() : '';
    }
};

module.exports = Format;
