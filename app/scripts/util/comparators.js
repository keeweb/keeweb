const LastChar = String.fromCharCode(0xffffffff);

const ciCompare = (window.Intl && window.Intl.Collator)
    ? new Intl.Collator(undefined, { sensitivity: 'base' }).compare
    : (x, y) => x.toLocaleLowerCase().localeCompare(y.toLocaleLowerCase());

const Comparators = {
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
    },

    boolComparator: function(field, asc) {
        if (asc) {
            return function (x, y) { return (x[field] ? 1 : 0) - (y[field] ? 1 : 0); };
        } else {
            return function (x, y) { return (y[field] ? 1 : 0) - (x[field] ? 1 : 0); };
        }
    }
};

module.exports = Comparators;
