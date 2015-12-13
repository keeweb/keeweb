'use strict';

var Backbone = require('backbone'),
    EntryModel = require('../models/entry-model'),
    Comparators = require('../util/comparators');

var EntryCollection = Backbone.Collection.extend({
    model: EntryModel,

    comparator: function() {},

    comparators: {
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

    initialize: function() {
        this.comparator = this.comparators[this.defaultComparator];
    },

    sortEntries: function(comparator) {
        this.comparator = this.comparators[comparator] || this.comparators[this.defaultComparator];
        this.sort();
    },

    attachmentSortVal: function(entry) {
        var att = entry.attachments;
        var str = att.length ? String.fromCharCode(64 + att.length) : 'Z';
        if (att[0]) {
            str += att[0].title;
        }
        return str;
    }
});

module.exports = EntryCollection;
