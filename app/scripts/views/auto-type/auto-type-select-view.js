import { View, DefaultTemplateOptions } from 'framework/views/view';
import { Events } from 'framework/events';
import { Shortcuts } from 'comp/app/shortcuts';
import { KeyHandler } from 'comp/browser/key-handler';
import { Keys } from 'const/keys';
import { AppSettingsModel } from 'models/app-settings-model';
import { EntryPresenter } from 'presenters/entry-presenter';
import { StringFormat } from 'util/formatting/string-format';
import { Locale } from 'util/locale';
import { Scrollable } from 'framework/views/scrollable';
import { DropdownView } from 'views/dropdown-view';
import template from 'templates/auto-type/auto-type-select.hbs';
import itemTemplate from 'templates/auto-type/auto-type-select-item.hbs';

class AutoTypeSelectView extends View {
    parent = 'body';
    modal = 'auto-type';

    template = template;

    itemTemplate = itemTemplate;

    events = {
        'click .at-select__header-filter-clear': 'clearFilterText',
        'click .at-select__item': 'itemClicked',
        'contextmenu .at-select__item': 'itemRightClicked'
    };

    result = null;
    entries = null;

    constructor(model) {
        super(model);
        this.initScroll();
        this.listenTo(Events, 'main-window-will-close', this.mainWindowWillClose);
        this.listenTo(Events, 'keypress:auto-type', this.keyPressed);
        this.setupKeys();
    }

    setupKeys() {
        this.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, false, 'auto-type');
        this.onKey(Keys.DOM_VK_RETURN, this.enterPressed, false, 'auto-type');
        this.onKey(
            Keys.DOM_VK_RETURN,
            this.actionEnterPressed,
            KeyHandler.SHORTCUT_ACTION,
            'auto-type'
        );
        this.onKey(Keys.DOM_VK_RETURN, this.optEnterPressed, KeyHandler.SHORTCUT_OPT, 'auto-type');
        this.onKey(
            Keys.DOM_VK_RETURN,
            this.shiftEnterPressed,
            KeyHandler.SHORTCUT_SHIFT,
            'auto-type'
        );
        this.onKey(Keys.DOM_VK_UP, this.upPressed, false, 'auto-type');
        this.onKey(Keys.DOM_VK_DOWN, this.downPressed, false, 'auto-type');
        this.onKey(Keys.DOM_VK_BACK_SPACE, this.backSpacePressed, false, 'auto-type');
        this.onKey(Keys.DOM_VK_O, this.openKeyPressed, KeyHandler.SHORTCUT_ACTION, 'auto-type');
    }

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
        const noColor = AppSettingsModel.colorfulIcons ? '' : 'grayscale';
        this.entries = this.model.filter.getEntries();
        this.result = this.entries[0];
        const presenter = new EntryPresenter(null, noColor, this.result && this.result.id);
        let itemsHtml = '';
        const itemTemplate = this.itemTemplate;
        this.entries.forEach((entry) => {
            presenter.present(entry);
            itemsHtml += itemTemplate(presenter, DefaultTemplateOptions);
        });
        super.render({
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
    }

    cancelAndClose() {
        this.result = null;
        this.emit('result', this.result);
    }

    closeWithResult(sequence) {
        this.emit('result', {
            entry: this.result,
            sequence
        });
    }

    escPressed() {
        if (this.model.filter.text) {
            this.clearFilterText();
        } else {
            this.cancelAndClose();
        }
    }

    enterPressed() {
        this.closeWithResult();
    }

    actionEnterPressed() {
        this.closeWithResult('{PASSWORD}');
    }

    optEnterPressed() {
        this.closeWithResult('{USERNAME}');
    }

    openKeyPressed() {
        this.emit('show-open-files');
    }

    shiftEnterPressed(e) {
        const activeItem = this.$el.find('.at-select__item[data-id="' + this.result.id + '"]');
        this.showItemOptions(activeItem, e);
    }

    upPressed(e) {
        e.preventDefault();
        const activeIndex = this.entries.indexOf(this.result) - 1;
        if (activeIndex >= 0) {
            this.result = this.entries[activeIndex];
            this.highlightActive();
        }
    }

    downPressed(e) {
        e.preventDefault();
        const activeIndex = this.entries.indexOf(this.result) + 1;
        if (activeIndex < this.entries.length) {
            this.result = this.entries[activeIndex];
            this.highlightActive();
        }
    }

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
    }

    keyPressed(e) {
        if (e.which && e.which !== Keys.DOM_VK_RETURN) {
            this.model.filter.text += String.fromCharCode(e.which);
            this.render();
        }
    }

    backSpacePressed() {
        if (this.model.filter.text) {
            this.model.filter.text = this.model.filter.text.substr(
                0,
                this.model.filter.text.length - 1
            );
            this.render();
        }
    }

    clearFilterText() {
        this.model.filter.text = '';
        this.render();
    }

    itemClicked(e) {
        const itemEl = $(e.target).closest('.at-select__item');
        const optionsClicked = $(e.target).closest('.at-select__item-options').length;

        if (optionsClicked) {
            this.showItemOptions(itemEl, e);
        } else {
            const id = itemEl.data('id');
            this.result = this.entries.get(id);
            this.closeWithResult();
        }
    }

    itemRightClicked(e) {
        const itemEl = $(e.target).closest('.at-select__item');
        this.showItemOptions(itemEl, e);
    }

    mainWindowWillClose(e) {
        e.preventDefault();
    }

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
    }

    hideItemOptionsDropdown() {
        if (this.views.optionsDropdown) {
            this.views.optionsDropdown.remove();
            delete this.views.optionsDropdown;
        }
    }

    itemOptionsDropdownSelect(e) {
        this.hideItemOptionsDropdown();
        const sequence = e.item;
        this.closeWithResult(sequence);
    }
}

Object.assign(AutoTypeSelectView.prototype, Scrollable);

export { AutoTypeSelectView };
