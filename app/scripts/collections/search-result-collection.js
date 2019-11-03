import { Collection } from 'framework/collection';
import { Model } from 'framework/model';
import { Comparators } from 'util/data/comparators';

class SearchResultCollection extends Collection {
    static model = Model;

    comparators = {
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
        '-attachments': (x, y) => {
            return this.attachmentSortVal(x).localeCompare(this.attachmentSortVal(y));
        },
        '-rank': Comparators.rankComparator().bind(this)
    };

    defaultComparator = 'title';

    entryFilter = null;

    constructor(models, options) {
        super(models);
        const comparatorName = (options && options.comparator) || this.defaultComparator;
        this.comparator = this.comparators[comparatorName];
    }

    sortEntries(comparator, filter) {
        this.entryFilter = filter;
        this.comparator = this.comparators[comparator] || this.comparators[this.defaultComparator];
        this.sort();
    }

    attachmentSortVal(entry) {
        const att = entry.attachments;
        let str = att.length ? String.fromCharCode(64 + att.length) : 'Z';
        if (att[0]) {
            str += att[0].title;
        }
        return str;
    }
}

export { SearchResultCollection };
