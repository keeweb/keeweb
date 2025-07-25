import { DateFormat } from 'comp/i18n/date-format';
import { Locale } from 'util/locale';

const EntryPresenter = function (descField, noColor, activeEntryId) {
    this.entry = null;
    this.descField = descField;
    this.noColor = noColor || '';
    this.activeEntryId = activeEntryId;
};

EntryPresenter.prototype = {
    present(item) {
        if (item.entry) {
            this.entry = item;
        } else if (item.group) {
            this.group = item;
        }
        return this;
    },
    reset() {
        this.entry = null;
        this.group = null;
    },
    get id() {
        return this.entry ? this.entry.id : this.group.id;
    },
    get icon() {
        return this.entry ? this.entry.icon : this.group.icon || 'folder';
    },
    get customIcon() {
        return this.entry ? this.entry.customIcon : undefined;
    },
    get color() {
        return this.entry
            ? this.entry.color || (this.entry.customIcon ? this.noColor : undefined)
            : undefined;
    },
    get title() {
        return this.entry ? this.entry.title : this.group.title;
    },
    get notes() {
        return this.entry ? this.entry.notes : undefined;
    },
    get url() {
        return this.entry ? this.entry.displayUrl : undefined;
    },
    get user() {
        return this.entry ? this.entry.user : undefined;
    },
    get active() {
        return this.entry ? this.entry.id === this.activeEntryId : this.group.active;
    },
    get created() {
        return this.entry ? DateFormat.dtStr(this.entry.created) : undefined;
    },
    get updated() {
        return this.entry ? DateFormat.dtStr(this.entry.updated) : undefined;
    },
    get expired() {
        return this.entry ? this.entry.expired : false;
    },
    get tags() {
        return this.entry ? this.entry.tags : undefined;
    },
    get groupName() {
        return this.entry ? this.entry.groupName : undefined;
    },
    get fileName() {
        return this.entry ? this.entry.fileName : undefined;
    },
    get description() {
        if (!this.entry) {
            return '[' + Locale.listGroup + ']';
        }
        if (this.entry.backend === 'otp-device') {
            return this.entry.description;
        }
        switch (this.descField) {
            case 'website':
                return this.url || '(' + Locale.listNoWebsite + ')';
            case 'user':
                return this.user || '(' + Locale.listNoUser + ')';
            case 'created':
                return this.created;
            case 'updated':
                return this.updated;
            case 'attachments':
                return (
                    this.entry.attachments.map((a) => a.title).join(', ') ||
                    '(' + Locale.listNoAttachments + ')'
                );
            default:
                return this.user || this.notes || this.url;
        }
    }
};

export { EntryPresenter };
