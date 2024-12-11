import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import { Shortcuts } from 'comp/app/shortcuts';
import { KeyHandler } from 'comp/browser/key-handler';
import { Keys } from 'const/keys';
import { Comparators } from 'util/data/comparators';
import { Features } from 'util/features';
import { StringFormat } from 'util/formatting/string-format';
import { Locale } from 'util/locale';
import { DropdownView } from 'views/dropdown-view';
import template from 'templates/list-search.hbs';

class ListSearchView extends View {
    parent = '.list__header';

    template = template;

    events = {
        'keydown .list__search-field': 'inputKeyDown',
        'keypress .list__search-field': 'inputKeyPress',
        'input .list__search-field': 'inputChange',
        'focus .list__search-field': 'inputFocus',
        'click .list__search-btn-new': 'createOptionsClick',
        'click .list__search-btn-sort': 'sortOptionsClick',
        'click .list__search-icon-search': 'advancedSearchClick',
        'click .list__search-btn-menu': 'toggleMenu',
        'click .list__search-icon-clear': 'clickClear',
        'change .list__search-adv input[type=checkbox]': 'toggleAdvCheck'
    };

    inputEl = null;
    sortOptions = null;
    sortIcons = null;
    createOptions = null;
    advancedSearchEnabled = false;
    advancedSearch = null;

    constructor(model) {
        super(model);
        this.sortOptions = [
            {
                value: 'title',
                icon: 'arrow-down-a-z',
                loc: () =>
                    StringFormat.capFirst(Locale.title) + ' ' + this.addArrow(Locale.searchAZ)
            },
            {
                value: '-title',
                icon: 'arrow-down-z-a',
                loc: () =>
                    StringFormat.capFirst(Locale.title) + ' ' + this.addArrow(Locale.searchZA)
            },
            {
                value: 'website',
                icon: 'arrow-down-a-z',
                loc: () =>
                    StringFormat.capFirst(Locale.website) + ' ' + this.addArrow(Locale.searchAZ)
            },
            {
                value: '-website',
                icon: 'arrow-down-z-a',
                loc: () =>
                    StringFormat.capFirst(Locale.website) + ' ' + this.addArrow(Locale.searchZA)
            },
            {
                value: 'user',
                icon: 'arrow-down-a-z',
                loc: () => StringFormat.capFirst(Locale.user) + ' ' + this.addArrow(Locale.searchAZ)
            },
            {
                value: '-user',
                icon: 'arrow-down-z-a',
                loc: () => StringFormat.capFirst(Locale.user) + ' ' + this.addArrow(Locale.searchZA)
            },
            {
                value: 'created',
                icon: 'arrow-down-1-9',
                loc: () => Locale.searchCreated + ' ' + this.addArrow(Locale.searchON)
            },
            {
                value: '-created',
                icon: 'arrow-down-9-1',
                loc: () => Locale.searchCreated + ' ' + this.addArrow(Locale.searchNO)
            },
            {
                value: 'updated',
                icon: 'arrow-down-1-9',
                loc: () => Locale.searchUpdated + ' ' + this.addArrow(Locale.searchON)
            },
            {
                value: '-updated',
                icon: 'arrow-down-9-1',
                loc: () => Locale.searchUpdated + ' ' + this.addArrow(Locale.searchNO)
            },
            {
                value: '-attachments',
                icon: 'arrow-down-wide-short',
                loc: () => Locale.searchAttachments
            },
            { value: '-rank', icon: 'arrow-down-wide-short', loc: () => Locale.searchRank }
        ];
        this.sortIcons = {};
        this.sortOptions.forEach((opt) => {
            this.sortIcons[opt.value] = opt.icon;
        });
        this.advancedSearch = {
            user: true,
            other: true,
            url: true,
            protect: false,
            notes: true,
            pass: false,
            cs: false,
            regex: false,
            history: false,
            title: true
        };
        if (this.model.advancedSearch) {
            this.advancedSearch = { ...this.model.advancedSearch };
        }
        this.setLocale();
        this.onKey(Keys.DOM_VK_F, this.findKeyPress, KeyHandler.SHORTCUT_ACTION);
        this.onKey(Keys.DOM_VK_N, this.newKeyPress, KeyHandler.SHORTCUT_OPT);
        this.onKey(Keys.DOM_VK_DOWN, this.downKeyPress);
        this.onKey(Keys.DOM_VK_UP, this.upKeyPress);
        this.listenTo(this, 'show', this.viewShown);
        this.listenTo(this, 'hide', this.viewHidden);
        this.listenTo(Events, 'filter', this.filterChanged);
        this.listenTo(Events, 'set-locale', this.setLocale);
        this.listenTo(Events, 'page-blur', this.pageBlur);
        this.listenTo(this.model.files, 'change', this.fileListUpdated);

        this.once('remove', () => {
            this.removeKeypressHandler();
        });
    }

    setLocale() {
        this.sortOptions.forEach((opt) => {
            opt.text = opt.loc();
        });
        this.createOptions = [
            {
                value: 'entry',
                icon: 'key',
                text: StringFormat.capFirst(Locale.entry),
                hint: Features.isMobile
                    ? null
                    : `(${Locale.searchShiftClickOr} ${Shortcuts.altShortcutSymbol(true)})`
            },
            { value: 'group', icon: 'folder', text: StringFormat.capFirst(Locale.group) }
        ];
        if (this.el) {
            this.render();
        }
    }

    pageBlur() {
        this.inputEl.blur();
    }

    removeKeypressHandler() {}

    viewShown() {
        const keypressHandler = (e) => this.documentKeyPress(e);
        Events.on('keypress', keypressHandler);
        this.removeKeypressHandler = () => Events.off('keypress', keypressHandler);
    }

    viewHidden() {
        this.removeKeypressHandler();
    }

    render() {
        let searchVal;
        if (this.inputEl) {
            searchVal = this.inputEl.val();
        }
        super.render({
            adv: this.advancedSearch,
            advEnabled: this.advancedSearchEnabled,
            canCreate: this.model.canCreateEntries()
        });
        this.inputEl = this.$el.find('.list__search-field');
        if (searchVal) {
            this.inputEl.val(searchVal);
        }
    }

    inputKeyDown(e) {
        switch (e.which) {
            case Keys.DOM_VK_UP:
            case Keys.DOM_VK_DOWN:
                break;
            case Keys.DOM_VK_RETURN:
                e.target.blur();
                break;
            case Keys.DOM_VK_ESCAPE:
                if (this.inputEl.val()) {
                    this.inputEl.val('');
                    this.inputChange();
                }
                e.target.blur();
                break;
            default:
                return;
        }
        e.preventDefault();
    }

    inputKeyPress(e) {
        e.stopPropagation();
    }

    inputChange() {
        const text = this.inputEl.val();
        this.inputEl[0].parentElement.classList.toggle('list__search-field-wrap--text', text);
        Events.emit('add-filter', { text });
    }

    inputFocus(e) {
        $(e.target).trigger('select');
    }

    documentKeyPress(e) {
        if (this.hidden) {
            return;
        }
        const code = e.charCode;
        if (!code) {
            return;
        }
        this.hideSearchOptions();
        this.inputEl.val(String.fromCharCode(code)).focus();
        this.inputEl[0].setSelectionRange(1, 1);
        this.inputChange();
        e.preventDefault();
    }

    findKeyPress(e) {
        if (!this.hidden) {
            e.preventDefault();
            this.hideSearchOptions();
            this.inputEl.select().focus();
        }
    }

    newKeyPress(e) {
        if (!this.hidden) {
            e.preventDefault();
            this.hideSearchOptions();
            this.emit('create-entry');
        }
    }

    downKeyPress(e) {
        e.preventDefault();
        this.hideSearchOptions();
        this.emit('select-next');
    }

    upKeyPress(e) {
        e.preventDefault();
        this.hideSearchOptions();
        this.emit('select-prev');
    }

    filterChanged(filter) {
        this.hideSearchOptions();
        if (filter.filter.text !== this.inputEl.val()) {
            this.inputEl.val(filter.text || '');
        }
        const sortIconCls = this.sortIcons[filter.sort] || 'sort';
        this.$el.find('.list__search-btn-sort>i').attr('class', 'fa fa-' + sortIconCls);
        let adv = !!filter.filter.advanced;
        if (this.model.advancedSearch) {
            adv = filter.filter.advanced !== this.model.advancedSearch;
        }
        if (this.advancedSearchEnabled !== adv) {
            this.advancedSearchEnabled = adv;
            this.$el.find('.list__search-adv').toggleClass('hide', !this.advancedSearchEnabled);
        }
    }

    createOptionsClick(e) {
        e.stopImmediatePropagation();
        if (e.shiftKey) {
            this.hideSearchOptions();
            this.emit('create-entry');
            return;
        }
        this.toggleCreateOptions();
    }

    sortOptionsClick(e) {
        this.toggleSortOptions();
        e.stopImmediatePropagation();
    }

    advancedSearchClick() {
        this.advancedSearchEnabled = !this.advancedSearchEnabled;
        this.$el.find('.list__search-adv').toggleClass('hide', !this.advancedSearchEnabled);
        let advanced = false;
        if (this.advancedSearchEnabled) {
            advanced = this.advancedSearch;
        } else if (this.model.advancedSearch) {
            advanced = this.model.advancedSearch;
        }
        Events.emit('add-filter', { advanced });
    }

    toggleMenu() {
        Events.emit('toggle-menu');
    }

    toggleAdvCheck(e) {
        const setting = $(e.target).data('id');
        this.advancedSearch[setting] = e.target.checked;
        Events.emit('add-filter', { advanced: this.advancedSearch });
    }

    hideSearchOptions() {
        if (this.views.searchDropdown) {
            this.views.searchDropdown.remove();
            this.views.searchDropdown = null;
            this.$el
                .find('.list__search-btn-sort,.list__search-btn-new')
                .removeClass('sel--active');
        }
    }

    toggleSortOptions() {
        if (this.views.searchDropdown && this.views.searchDropdown.isSort) {
            this.hideSearchOptions();
            return;
        }
        this.hideSearchOptions();
        this.$el.find('.list__search-btn-sort').addClass('sel--active');
        const view = new DropdownView();
        view.isSort = true;
        this.listenTo(view, 'cancel', this.hideSearchOptions);
        this.listenTo(view, 'select', this.sortDropdownSelect);
        this.sortOptions.forEach(function (opt) {
            opt.active = this.model.sort === opt.value;
        }, this);
        view.render({
            position: {
                top: this.$el.find('.list__search-btn-sort')[0].getBoundingClientRect().bottom,
                right: this.$el[0].getBoundingClientRect().right + 1
            },
            options: this.sortOptions
        });
        this.views.searchDropdown = view;
    }

    toggleCreateOptions() {
        if (this.views.searchDropdown && this.views.searchDropdown.isCreate) {
            this.hideSearchOptions();
            return;
        }

        this.hideSearchOptions();
        this.$el.find('.list__search-btn-new').addClass('sel--active');
        const view = new DropdownView();
        view.isCreate = true;
        this.listenTo(view, 'cancel', this.hideSearchOptions);
        this.listenTo(view, 'select', this.createDropdownSelect);
        view.render({
            position: {
                top: this.$el.find('.list__search-btn-new')[0].getBoundingClientRect().bottom,
                right: this.$el[0].getBoundingClientRect().right + 1
            },
            options: this.createOptions.concat(this.getCreateEntryTemplateOptions())
        });
        this.views.searchDropdown = view;
    }

    getCreateEntryTemplateOptions() {
        const entryTemplates = this.model.getEntryTemplates();
        const hasMultipleFiles = this.model.files.length > 1;
        this.entryTemplates = {};
        const options = [];
        entryTemplates.forEach((tmpl) => {
            const id = 'tmpl:' + tmpl.entry.id;
            options.push({
                value: id,
                icon: tmpl.entry.icon,
                text: hasMultipleFiles
                    ? tmpl.file.name + ' / ' + tmpl.entry.title
                    : tmpl.entry.title
            });
            this.entryTemplates[id] = tmpl;
        });
        options.sort(Comparators.stringComparator('text', true));
        options.push({
            value: 'tmpl',
            icon: 'note-sticky-o',
            text: StringFormat.capFirst(Locale.template)
        });
        return options;
    }

    sortDropdownSelect(e) {
        this.hideSearchOptions();
        Events.emit('set-sort', e.item);
    }

    createDropdownSelect(e) {
        this.hideSearchOptions();
        switch (e.item) {
            case 'entry':
                this.emit('create-entry');
                break;
            case 'group':
                this.emit('create-group');
                break;
            case 'tmpl':
                this.emit('create-template');
                break;
            default:
                if (this.entryTemplates[e.item]) {
                    this.emit('create-entry', { template: this.entryTemplates[e.item] });
                }
        }
    }

    addArrow(str) {
        return str.replace('{}', '→');
    }

    fileListUpdated() {
        this.render();
    }

    clickClear() {
        this.inputEl.val('');
        this.inputChange();
    }
}

export { ListSearchView };
