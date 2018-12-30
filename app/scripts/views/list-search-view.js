const Backbone = require('backbone');
const Keys = require('../const/keys');
const KeyHandler = require('../comp/key-handler');
const DropdownView = require('./dropdown-view');
const FeatureDetector = require('../util/feature-detector');
const Format = require('../util/format');
const Locale = require('../util/locale');
const Comparators = require('../util/comparators');

const ListSearchView = Backbone.View.extend({
    template: require('templates/list-search.hbs'),

    events: {
        'keydown .list__search-field': 'inputKeyDown',
        'keypress .list__search-field': 'inputKeyPress',
        'input .list__search-field': 'inputChange',
        'focus .list__search-field': 'inputFocus',
        'click .list__search-btn-new': 'createOptionsClick',
        'click .list__search-btn-sort': 'sortOptionsClick',
        'click .list__search-icon-search': 'advancedSearchClick',
        'click .list__search-btn-menu': 'toggleMenu',
        'change .list__search-adv input[type=checkbox]': 'toggleAdvCheck'
    },

    views: null,

    inputEl: null,
    sortOptions: null,
    sortIcons: null,
    createOptions: null,
    advancedSearchEnabled: false,
    advancedSearch: null,

    initialize: function () {
        this.sortOptions = [
            { value: 'title', icon: 'sort-alpha-asc', loc: () => Format.capFirst(Locale.title) + ' ' + this.addArrow(Locale.searchAZ) },
            { value: '-title', icon: 'sort-alpha-desc', loc: () => Format.capFirst(Locale.title) + ' ' + this.addArrow(Locale.searchZA) },
            { value: 'website', icon: 'sort-alpha-asc', loc: () => Format.capFirst(Locale.website) + ' ' + this.addArrow(Locale.searchAZ) },
            { value: '-website', icon: 'sort-alpha-desc', loc: () => Format.capFirst(Locale.website) + ' ' + this.addArrow(Locale.searchZA) },
            { value: 'user', icon: 'sort-alpha-asc', loc: () => Format.capFirst(Locale.user) + ' ' + this.addArrow(Locale.searchAZ) },
            { value: '-user', icon: 'sort-alpha-desc', loc: () => Format.capFirst(Locale.user) + ' ' + this.addArrow(Locale.searchZA) },
            { value: 'created', icon: 'sort-numeric-asc', loc: () => Locale.searchCreated + ' ' + this.addArrow(Locale.searchON) },
            { value: '-created', icon: 'sort-numeric-desc', loc: () => Locale.searchCreated + ' ' + this.addArrow(Locale.searchNO) },
            { value: 'updated', icon: 'sort-numeric-asc', loc: () => Locale.searchUpdated + ' ' + this.addArrow(Locale.searchON) },
            { value: '-updated', icon: 'sort-numeric-desc', loc: () => Locale.searchUpdated + ' ' + this.addArrow(Locale.searchNO) },
            { value: '-attachments', icon: 'sort-amount-desc', loc: () => Locale.searchAttachments }
        ];
        this.sortIcons = {};
        this.sortOptions.forEach(function(opt) {
            this.sortIcons[opt.value] = opt.icon;
        }, this);
        this.views = {};
        this.advancedSearch = {
            user: true, other: true,
            url: true, protect: false,
            notes: true, pass: false,
            cs: false, regex: false,
            history: false, title: true
        };
        if (this.model.advancedSearch) {
            this.advancedSearch = _.extend({}, this.model.advancedSearch);
        }
        this.setLocale();
        KeyHandler.onKey(Keys.DOM_VK_F, this.findKeyPress, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.onKey(Keys.DOM_VK_N, this.newKeyPress, this, KeyHandler.SHORTCUT_OPT);
        KeyHandler.onKey(Keys.DOM_VK_DOWN, this.downKeyPress, this);
        KeyHandler.onKey(Keys.DOM_VK_UP, this.upKeyPress, this);
        this.listenTo(this, 'show', this.viewShown);
        this.listenTo(this, 'hide', this.viewHidden);
        this.listenTo(Backbone, 'filter', this.filterChanged);
        this.listenTo(Backbone, 'set-locale', this.setLocale);
        this.listenTo(Backbone, 'page-blur', this.pageBlur);
    },

    remove: function() {
        KeyHandler.offKey(Keys.DOM_VK_F, this.findKeyPress, this);
        KeyHandler.offKey(Keys.DOM_VK_N, this.newKeyPress, this);
        KeyHandler.offKey(Keys.DOM_VK_DOWN, this.downKeyPress, this);
        KeyHandler.offKey(Keys.DOM_VK_UP, this.upKeyPress, this);
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    setLocale: function() {
        this.sortOptions.forEach(opt => { opt.text = opt.loc(); });
        const entryDesc = FeatureDetector.isMobile ? '' : (' <span class="muted-color">(' + Locale.searchShiftClickOr + ' ' +
        FeatureDetector.altShortcutSymbol(true) + 'N)</span>');
        this.createOptions = [
            { value: 'entry', icon: 'key', text: Format.capFirst(Locale.entry) + entryDesc },
            { value: 'group', icon: 'folder', text: Format.capFirst(Locale.group) }
        ];
        this.render();
    },

    pageBlur: function() {
        this.inputEl.blur();
    },

    viewShown: function() {
        this.listenTo(KeyHandler, 'keypress', this.documentKeyPress);
    },

    viewHidden: function() {
        this.stopListening(KeyHandler, 'keypress', this.documentKeyPress);
    },

    render: function () {
        let searchVal;
        if (this.inputEl) {
            searchVal = this.inputEl.val();
        }
        this.renderTemplate({
            adv: this.advancedSearch,
            advEnabled: this.advancedSearchEnabled
        });
        this.inputEl = this.$el.find('.list__search-field');
        if (searchVal) {
            this.inputEl.val(searchVal);
        }
        return this;
    },

    inputKeyDown: function(e) {
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
    },

    inputKeyPress: function(e) {
        e.stopPropagation();
    },

    inputChange: function() {
        Backbone.trigger('add-filter', { text: this.inputEl.val() });
    },

    inputFocus: function(e) {
        $(e.target).select();
    },

    documentKeyPress: function(e) {
        if (this._hidden) {
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
    },

    findKeyPress: function(e) {
        if (!this._hidden) {
            e.preventDefault();
            this.hideSearchOptions();
            this.inputEl.select().focus();
        }
    },

    newKeyPress: function(e) {
        if (!this._hidden) {
            e.preventDefault();
            this.hideSearchOptions();
            this.trigger('create-entry');
        }
    },

    downKeyPress: function(e) {
        e.preventDefault();
        this.hideSearchOptions();
        this.trigger('select-next');
    },

    upKeyPress: function(e) {
        e.preventDefault();
        this.hideSearchOptions();
        this.trigger('select-prev');
    },

    filterChanged: function(filter) {
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
    },

    createOptionsClick: function(e) {
        e.stopImmediatePropagation();
        if (e.shiftKey) {
            this.hideSearchOptions();
            this.trigger('create-entry');
            return;
        }
        this.toggleCreateOptions();
    },

    sortOptionsClick: function(e) {
        this.toggleSortOptions();
        e.stopImmediatePropagation();
    },

    advancedSearchClick: function() {
        this.advancedSearchEnabled = !this.advancedSearchEnabled;
        this.$el.find('.list__search-adv').toggleClass('hide', !this.advancedSearchEnabled);
        let advanced = false;
        if (this.advancedSearchEnabled) {
            advanced = this.advancedSearch;
        } else if (this.model.advancedSearch) {
            advanced = this.model.advancedSearch;
        }
        Backbone.trigger('add-filter', { advanced });
    },

    toggleMenu: function() {
        Backbone.trigger('toggle-menu');
    },

    toggleAdvCheck: function(e) {
        const setting = $(e.target).data('id');
        this.advancedSearch[setting] = e.target.checked;
        Backbone.trigger('add-filter', { advanced: this.advancedSearch });
    },

    hideSearchOptions: function() {
        if (this.views.searchDropdown) {
            this.views.searchDropdown.remove();
            this.views.searchDropdown = null;
            this.$el.find('.list__search-btn-sort,.list__search-btn-new').removeClass('sel--active');
        }
    },

    toggleSortOptions: function() {
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
        this.sortOptions.forEach(function(opt) {
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
    },

    toggleCreateOptions: function() {
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
    },

    getCreateEntryTemplateOptions: function() {
        const entryTemplates = this.model.getEntryTemplates();
        const hasMultipleFiles = this.model.files.length > 1;
        this.entryTemplates = {};
        const options = [];
        entryTemplates.forEach(tmpl => {
            const id = 'tmpl:' + tmpl.entry.id;
            options.push({
                value: id,
                icon: tmpl.entry.icon,
                text: hasMultipleFiles ? tmpl.file.get('name') + ' / ' + tmpl.entry.title : tmpl.entry.title
            });
            this.entryTemplates[id] = tmpl;
        });
        options.sort(Comparators.stringComparator('text', true));
        options.push({ value: 'tmpl', icon: 'sticky-note-o', text: Format.capFirst(Locale.template) });
        return options;
    },

    sortDropdownSelect: function(e) {
        this.hideSearchOptions();
        Backbone.trigger('set-sort', e.item);
    },

    createDropdownSelect: function(e) {
        this.hideSearchOptions();
        switch (e.item) {
            case 'entry':
                this.trigger('create-entry');
                break;
            case 'group':
                this.trigger('create-group');
                break;
            case 'tmpl':
                this.trigger('create-template');
                break;
            default:
                if (this.entryTemplates[e.item]) {
                    this.trigger('create-entry', { template: this.entryTemplates[e.item] });
                }
        }
    },

    addArrow(str) {
        return str.replace('{}', '&rarr;');
    }
});

module.exports = ListSearchView;
