'use strict';

var Format = require('../util/format');

var EntryPresenter = function(descField) {
    this.entry = null;
    this.descField = descField;
};

EntryPresenter.prototype = {
    present: function(entry) { this.entry = entry; return this; },
    get id() { return this.entry.id; },
    get icon() { return this.entry.icon; },
    get color() { return this.entry.color; },
    get title() { return this.entry.title; },
    get notes() { return this.entry.notes; },
    get url() { return this.entry.url; },
    get user() { return this.entry.user; },
    get active() { return this.entry.active; },
    get created() { return Format.dtStr(this.entry.created); },
    get updated() { return Format.dtStr(this.entry.updated); },
    get expired() { return this.entry.expired; },
    get deleted() { return this.entry.deleted; },
    get description() {
        switch (this.descField) {
            case 'website':
                return this.url || '(no website)';
            case 'user':
                return this.user || '(no user)';
            case 'created':
                return this.created;
            case 'updated':
                return this.updated;
            case 'attachments':
                return this.entry.attachments.map(function(a) { return a.title; }).join(', ') || '(no attachments)';
            default:
                return this.notes || this.url || this.user;
        }
    }
};

module.exports = EntryPresenter;
