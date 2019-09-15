const Backbone = require('backbone');
const Keys = require('../../const/keys');
const KeyHandler = require('../../comp/browser/key-handler');
const Locale = require('../../util/locale');
const AppSettingsModel = require('../../models/app-settings-model');
const EntryPresenter = require('../../presenters/entry-presenter');
const Scrollable = require('../../view-engine/scrollable');
const Shortcuts = require('../../comp/app/shortcuts');
const DropdownView = require('../dropdown-view');
const StringFormat = require('../../util/formatting/string-format');

const AutoTypePopupView = Backbone.View.extend({
    el: 'body',

    template: require('templates/auto-type/auto-type-select.hbs'),
    itemTemplate: require('templates/auto-type/auto-type-select-item.hbs'),

    events: {
        'click .at-select__header-filter-clear': 'clearFilterText',
        'click .at-select__item': 'itemClicked',
        'contextmenu .at-select__item': 'itemRightClicked'
    },

    result: null,
    entries: null,

    initialize() {
        this.views = {};
        this.initScroll();
        this.listenTo(Backbone, 'main-window-blur', this.mainWindowBlur);
        this.listenTo(Backbone, 'main-window-will-close', this.mainWindowWillClose);
        this.setupKeys();
    },

    setupKeys() {
        KeyHandler.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, this, false, 'auto-type');
        KeyHandler.onKey(Keys.DOM_VK_RETURN, this.enterPressed, this, false, 'auto-type');
        KeyHandler.onKey(
            Keys.DOM_VK_RETURN,
            this.actionEnterPressed,
            this,
            KeyHandler.SHORTCUT_ACTION,
            'auto-type'
        );
        KeyHandler.onKey(
            Keys.DOM_VK_RETURN,
            this.optEnterPressed,
            this,
            KeyHandler.SHORTCUT_OPT,
            'auto-type'
        );
        KeyHandler.onKey(
            Keys.DOM_VK_RETURN,
            this.shiftEnterPressed,
            this,
            KeyHandler.SHORTCUT_SHIFT,
            'auto-type'
        );
        KeyHandler.onKey(Keys.DOM_VK_UP, this.upPressed, this, false, 'auto-type');
        KeyHandler.onKey(Keys.DOM_VK_DOWN, this.downPressed, this, false, 'auto-type');
        KeyHandler.onKey(Keys.DOM_VK_BACK_SPACE, this.backSpacePressed, this, false, 'auto-type');
        KeyHandler.onKey(
            Keys.DOM_VK_O,
            this.openKeyPressed,
            this,
            KeyHandler.SHORTCUT_ACTION,
            'auto-type'
        );
        KeyHandler.on('keypress:auto-type', this.keyPressed.bind(this));
        KeyHandler.setModal('auto-type');
    },

    removeKeys() {
        KeyHandler.offKey(Keys.DOM_VK_ESCAPE, this.escPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_RETURN, this.enterPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_RETURN, this.actionEnterPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_RETURN, this.optEnterPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_RETURN, this.shiftEnterPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_UP, this.upPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_DOWN, this.downPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_BACK_SPACE, this.backSpacePressed, this);
        KeyHandler.offKey(Keys.DOM_VK_O, this.openKeyPressed, this);
        KeyHandler.off('keypress:auto-type');
        KeyHandler.setModal(null);
    },

    render() {
        let topMessage;
        if (this.model.filter.title || this.model.filter.url) {
            topMessage = Locale.autoTypeMsgMatchedByWindow.replace(
                '{}',
                this.model.filter.title || this.model.filter.url
            );
        } else {
            topMessage = Locale.autoTypeMsgNoWindow;
        }
        const noColor = AppSettingsModel.instance.get('colorfulIcons') ? '' : 'grayscale';
        this.entries = this.model.filter.getEntries();
        this.result = this.entries.first();
        const presenter = new EntryPresenter(null, noColor, this.result && this.result.id);
        let itemsHtml = '';
        const itemTemplate = this.itemTemplate;
        this.entries.forEach(entry => {
            presenter.present(entry);
            itemsHtml += itemTemplate(presenter);
        });
        this.renderTemplate({
            filterText: this.model.filter.text,
            topMessage,
            itemsHtml,
            actionSymbol: Shortcuts.actionShortcutSymbol(true),
            altSymbol: Shortcuts.altShortcutSymbol(true),
            shiftSymbol: Shortcuts.shiftShortcutSymbol(true),
            keyEnter: Locale.keyEnter
        });
        document.activeElement.blur();
        this.createScroll({
            root: this.$el.find('.at-select__items')[0],
            scroller: this.$el.find('.scroller')[0],
            bar: this.$el.find('.scroller__bar')[0]
        });
        return this;
    },

    remove() {
        this.removeKeys();
        Backbone.View.prototype.remove.apply(this);
    },

    cancelAndClose() {
        this.result = null;
        this.trigger('result', this.result);
    },

    closeWithResult(sequence) {
        this.trigger('result', {
            entry: this.result,
            sequence
        });
    },

    escPressed() {
        if (this.model.filter.text) {
            this.clearFilterText();
        } else {
            this.cancelAndClose();
        }
    },

    enterPressed() {
        this.closeWithResult();
    },

    actionEnterPressed() {
        this.closeWithResult('{PASSWORD}');
    },

    optEnterPressed() {
        this.closeWithResult('{USERNAME}');
    },

    openKeyPressed() {
        this.removeKeys();
        this.trigger('show-open-files');
    },

    shiftEnterPressed(e) {
        const activeItem = this.$el.find('.at-select__item[data-id="' + this.result.id + '"]');
        this.showItemOptions(activeItem, e);
    },

    upPressed(e) {
        e.preventDefault();
        const activeIndex = this.entries.indexOf(this.result) - 1;
        if (activeIndex >= 0) {
            this.result = this.entries.at(activeIndex);
            this.highlightActive();
        }
    },

    downPressed(e) {
        e.preventDefault();
        const activeIndex = this.entries.indexOf(this.result) + 1;
        if (activeIndex < this.entries.length) {
            this.result = this.entries.at(activeIndex);
            this.highlightActive();
        }
    },

    highlightActive() {
        this.$el.find('.at-select__item').removeClass('at-select__item--active');
        const activeItem = this.$el.find('.at-select__item[data-id="' + this.result.id + '"]');
        activeItem.addClass('at-select__item--active');
        const itemRect = activeItem[0].getBoundingClientRect();
        const listRect = this.scroller[0].getBoundingClientRect();
        if (itemRect.top < listRect.top) {
            this.scroller[0].scrollTop += itemRect.top - listRect.top;
        } else if (itemRect.bottom > listRect.bottom) {
            this.scroller[0].scrollTop += itemRect.bottom - listRect.bottom;
        }
    },

    keyPressed(e) {
        if (e.which && e.which !== Keys.DOM_VK_RETURN) {
            this.model.filter.text += String.fromCharCode(e.which);
            this.render();
        }
    },

    backSpacePressed() {
        if (this.model.filter.text) {
            this.model.filter.text = this.model.filter.text.substr(
                0,
                this.model.filter.text.length - 1
            );
            this.render();
        }
    },

    clearFilterText() {
        this.model.filter.text = '';
        this.render();
    },

    itemClicked(e) {
        const itemEl = $(e.target).closest('.at-select__item');
        const optionsClicked = $(e.target).closest('.at-select__item-options');

        if (optionsClicked) {
            this.showItemOptions(itemEl, e);
        } else {
            const id = itemEl.data('id');
            this.result = this.entries.get(id);
            this.closeWithResult();
        }
    },

    itemRightClicked(e) {
        const itemEl = $(e.target).closest('.at-select__item');
        this.showItemOptions(itemEl, e);
    },

    mainWindowBlur() {
        this.cancelAndClose();
    },

    mainWindowWillClose(e) {
        e.preventDefault();
        this.cancelAndClose();
    },

    showItemOptions(itemEl, event) {
        if (event) {
            event.stopImmediatePropagation();
        }

        const id = itemEl.data('id');
        const entry = this.entries.get(id);

        if (this.views.optionsDropdown) {
            this.hideItemOptionsDropdown();
            if (this.result && this.result.id === entry.id) {
                return;
            }
        }

        this.result = entry;
        if (!itemEl.hasClass('at-select__item--active')) {
            this.highlightActive();
        }

        const view = new DropdownView();
        this.listenTo(view, 'cancel', this.hideItemOptionsDropdown);
        this.listenTo(view, 'select', this.itemOptionsDropdownSelect);

        const options = [];

        if (entry.fields.otp) {
            options.push({
                value: '{TOTP}',
                icon: 'clock-o',
                text: Locale.autoTypeSelectionOtp
            });
        }
        if (entry.user) {
            options.push({
                value: '{USERNAME}',
                icon: 'user',
                text: StringFormat.capFirst(Locale.user)
            });
        }
        if (entry.password) {
            options.push({
                value: '{PASSWORD}',
                icon: 'key',
                text: StringFormat.capFirst(Locale.password)
            });
        }

        for (const field of Object.keys(entry.fields)) {
            if (field !== 'otp') {
                options.push({
                    value: `{S:${field}}`,
                    icon: 'th-list',
                    text: field
                });
            }
        }

        let position;
        if (event && event.button === 2) {
            position = {
                top: event.pageY,
                left: event.pageX
            };
        } else {
            const targetElRect = itemEl[0].getBoundingClientRect();
            position = {
                top: targetElRect.bottom,
                right: targetElRect.right
            };
        }

        view.render({
            position,
            options
        });

        this.views.optionsDropdown = view;
    },

    hideItemOptionsDropdown() {
        if (this.views.optionsDropdown) {
            this.views.optionsDropdown.remove();
            delete this.views.optionsDropdown;
        }
    },

    itemOptionsDropdownSelect(e) {
        this.hideItemOptionsDropdown();
        const sequence = e.item;
        this.closeWithResult(sequence);
    }
});

_.extend(AutoTypePopupView.prototype, Scrollable);

module.exports = AutoTypePopupView;
