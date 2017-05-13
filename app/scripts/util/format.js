const Locale = require('./locale');

const Format = {
    pad: function(num, digits) {
        let str = num.toString();
        while (str.length < digits) {
            str = '0' + str;
        }
        return str;
    },
    padStr: function(str, len) {
        while (str.length < len) {
            str += ' ';
        }
        return str;
    },
    dtStr: function(dt) {
        if (typeof dt === 'number') {
            dt = new Date(dt);
        }
        return dt ? this.dStr(dt) + ' ' + this.pad(dt.getHours(), 2) + ':' + this.pad(dt.getMinutes(), 2) +
            ':' + this.pad(dt.getSeconds(), 2) : '';
    },
    dStr: function(dt) {
        if (typeof dt === 'number') {
            dt = new Date(dt);
        }
        return dt ? dt.getDate() + ' ' + Locale.monthsShort[dt.getMonth()] + ' ' + dt.getFullYear() : '';
    },
    capFirst: function(str) {
        if (!str) {
            return '';
        }
        return str[0].toUpperCase() + str.substr(1);
    },
    dtStrFs: function(dt) {
        if (typeof dt === 'number') {
            dt = new Date(dt);
        }
        return dt ? dt.getFullYear() + '-' + this.pad(dt.getMonth() + 1, 2) + '-' + this.pad(dt.getDate(), 2) + 'T' +
            this.pad(dt.getHours(), 2) + '-' + this.pad(dt.getMinutes(), 2) + '-' + this.pad(dt.getSeconds(), 2)
            : '';
    }
};

module.exports = Format;
