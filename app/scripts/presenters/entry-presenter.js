'use strict';

var Format = require('../util/format');

var EntryPresenter = function(descField) {
    this.entry = null;
    this.descField = descField;
};

EntryPresenter.prototype = {
    present: function(item) {
        if (item.entry) {
            this.entry = item;
        } else {
            this.group = item;
        }
        return this;
    },
    get id() { return this.entry ? this.entry.id : this.group.get('id'); },
    get icon() { return this.entry ? this.entry.icon : this.group.get('icon'); },
    get color() { return this.entry ? this.entry.color : undefined; },
    get title() { return this.entry ? this.entry.title : this.group.get('title'); },
    get notes() { return this.entry ? this.entry.notes : undefined; },
    get url() { return this.entry ? this.entry.url : undefined; },
    get user() { return this.entry ? this.entry.user : undefined; },
    get active() { return this.entry ? this.entry.active : this.group.active; },
    get created() { return this.entry ? Format.dtStr(this.entry.created) : undefined; },
    get updated() { return this.entry ? Format.dtStr(this.entry.updated) : undefined; },
    get expired() { return this.entry ? this.entry.expired : false; },
    get deleted() { return this.entry ? this.entry.deleted : undefined; },
    get description() {
        if (!this.entry) {
            return '[Group]';
        }
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
