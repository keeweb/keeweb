const LastChar = String.fromCharCode(0xfffd);

const ciCompare = (window.Intl && window.Intl.Collator && !/Edge/.test(navigator.userAgent)) // bugged in Edge: #808
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

    rankComparator: function() {
        return function (x, y) { return y.getRank(this.filter.textLower) - x.getRank(this.filter.textLower); };
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
