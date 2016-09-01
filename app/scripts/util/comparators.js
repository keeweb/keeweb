'use strict';

var LastChar = String.fromCharCode(0xffffffff);

var ciCompare = (window.Intl && window.Intl.Collator)
    ? new Intl.Collator(undefined, { sensitivity: 'base' }).compare
    : (x, y) => x.toLocaleLowerCase().localeCompare(y.toLocaleLowerCase());

var Comparators = {
    stringComparator: function(field, asc) {
        if (asc) {
            return function (x, y) { return ciCompare(x[field] || LastChar, y[field] || LastChar); };
        } else {
            return function (x, y) { return ciCompare(y[field], x[field]); };
        }
    },

    dateComparator: function(field, asc) {
        if (asc) {
            return function (x, y) { return x[field] - y[field]; };
        } else {
            return function (x, y) { return y[field] - x[field]; };
        }
    }
};

module.exports = Comparators;
