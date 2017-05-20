const Backbone = require('backbone');
const EntryModel = require('../models/entry-model');
const Comparators = require('../util/comparators');

const EntryCollection = Backbone.Collection.extend({
    model: EntryModel,

    comparator: null,

    comparators: {
        'none': null,
        'title': Comparators.stringComparator('title', true),
        '-title': Comparators.stringComparator('title', false),
        'website': Comparators.stringComparator('url', true),
        '-website': Comparators.stringComparator('url', false),
        'user': Comparators.stringComparator('user', true),
        '-user': Comparators.stringComparator('user', false),
        'created': Comparators.dateComparator('created', true),
        '-created': Comparators.dateComparator('created', false),
        'updated': Comparators.dateComparator('updated', true),
        '-updated': Comparators.dateComparator('updated', false),
        '-attachments': function(x, y) { return this.attachmentSortVal(x).localeCompare(this.attachmentSortVal(y)); }
    },

    defaultComparator: 'title',

    initialize: function(models, options) {
        const comparatorName = options && options.comparator || this.defaultComparator;
        this.comparator = this.comparators[comparatorName];
    },

    sortEntries: function(comparator) {
        this.comparator = this.comparators[comparator] || this.comparators[this.defaultComparator];
        this.sort();
    },

    attachmentSortVal: function(entry) {
        const att = entry.attachments;
        let str = att.length ? String.fromCharCode(64 + att.length) : 'Z';
        if (att[0]) {
            str += att[0].title;
        }
        return str;
    }
});

module.exports = EntryCollection;
