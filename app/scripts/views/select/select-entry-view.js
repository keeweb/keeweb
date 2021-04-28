import { View, DefaultTemplateOptions } from 'framework/views/view';
import { Events } from 'framework/events';
import { Shortcuts } from 'comp/app/shortcuts';
import { KeyHandler } from 'comp/browser/key-handler';
import { Keys } from 'const/keys';
import { AppSettingsModel } from 'models/app-settings-model';
import { EntryPresenter } from 'presenters/entry-presenter';
import { StringFormat } from 'util/formatting/string-format';
import { UrlFormat } from 'util/formatting/url-format';
import { Locale } from 'util/locale';
import { Scrollable } from 'framework/views/scrollable';
import { DropdownView } from 'views/dropdown-view';
import { ExtraUrlFieldName } from 'models/entry-model';
import template from 'templates/select/select-entry.hbs';
import itemTemplate from 'templates/select/select-entry-item.hbs';

class SelectEntryView extends View {
    parent = 'body';
    modal = 'select-entry';

    template = template;

    itemTemplate = itemTemplate;

    events = {
        'click .select-entry__header-filter-clear': 'clearFilterText',
        'click .select-entry__item': 'itemClicked',
        'contextmenu .select-entry__item': 'itemRightClicked',
        'click .select-entry__filter': 'filterClicked',
        'click .select-entry__cancel-btn': 'cancelClicked'
    };

    result = null;
    entries = null;

    constructor(model) {
        super(model);
        this.initScroll();
        this.listenTo(Events, 'main-window-blur', this.mainWindowBlur);
        this.listenTo(Events, 'keypress:select-entry', this.keyPressed);
        this.setupKeys();
    }

    setupKeys() {
        this.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, false, 'select-entry');
        this.onKey(Keys.DOM_VK_RETURN, this.enterPressed, false, 'select-entry');
        if (this.model.isAutoType) {
            this.onKey(
                Keys.DOM_VK_RETURN,
                this.actionEnterPressed,
                KeyHandler.SHORTCUT_ACTION,
                'select-entry'
            );
            this.onKey(
                Keys.DOM_VK_RETURN,
                this.optEnterPressed,
                KeyHandler.SHORTCUT_OPT,
                'select-entry'
            );
            this.onKey(
                Keys.DOM_VK_RETURN,
                this.shiftEnterPressed,
                KeyHandler.SHORTCUT_SHIFT,
                'select-entry'
            );
            this.onKey(
                Keys.DOM_VK_O,
                this.openKeyPressed,
                KeyHandler.SHORTCUT_ACTION,
                'select-entry'
            );
        }
        this.onKey(Keys.DOM_VK_UP, this.upPressed, false, 'select-entry');
        this.onKey(Keys.DOM_VK_DOWN, this.downPressed, false, 'select-entry');
        this.onKey(Keys.DOM_VK_BACK_SPACE, this.backSpacePressed, false, 'select-entry');
    }

    render() {
        const noColor = AppSettingsModel.colorfulIcons ? '' : 'grayscale';

        this.entries = this.model.filter.getEntries();
        if (!this.result || !this.entries.includes(this.result)) {
            this.result = this.entries[0];
        }

        const presenter = new EntryPresenter(null, noColor, this.result?.id);
        presenter.itemOptions = this.model.itemOptions;

        let itemsHtml = '';
        const itemTemplate = this.itemTemplate;
        this.entries.forEach((entry) => {
            presenter.present(entry);
            itemsHtml += itemTemplate(presenter, DefaultTemplateOptions);
        });

        const filters = [];
        if (this.model.filter.url) {
            const shortUrl = UrlFormat.presentAsShortUrl(this.model.filter.url);
            filters.push({
                id: 'url',
                type: StringFormat.capFirst(Locale.website),
                text: shortUrl,
                active: this.model.filter.useUrl
            });

            filters.push({
                id: 'subdomains',
                type: StringFormat.capFirst(Locale.selectEntrySubdomains),
                active: this.model.filter.useUrl && this.model.filter.subdomains
            });
        }
        if (this.model.filter.title) {
            filters.push({
                id: 'title',
                type: StringFormat.capFirst(Locale.title),
                text: this.model.filter.title,
                active: this.model.filter.useTitle
            });
        }
        if (this.model.filter.text) {
            filters.push({
                id: 'text',
                type: StringFormat.capFirst(Locale.selectEntryContains),
                text: this.model.filter.text,
                active: true
            });
        }

        super.render({
            isAutoType: this.model.isAutoType,
            topMessage: this.model.topMessage,
            filters,
            itemsHtml,
            actionSymbol: Shortcuts.actionShortcutSymbol(true),
            altSymbol: Shortcuts.altShortcutSymbol(true),
            shiftSymbol: Shortcuts.shiftShortcutSymbol(true),
            keyEnter: Locale.keyEnter,
            keyEsc: Locale.keyEsc
        });

        document.activeElement.blur();

        this.createScroll({
            root: this.$el.find('.select-entry__items')[0],
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
        this.cancelAndClose();
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
        const activeItem = this.$el.find('.select-entry__item[data-id="' + this.result.id + '"]');
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
        this.$el.find('.select-entry__item').removeClass('select-entry__item--active');
        const activeItem = this.$el.find('.select-entry__item[data-id="' + this.result.id + '"]');
        activeItem.addClass('select-entry__item--active');
        const itemRect = activeItem[0].getBoundingClientRect();
        const listRect = this.scroller[0].getBoundingClientRect();
        if (itemRect.top < listRect.top) {
            this.scroller[0].scrollTop += itemRect.top - listRect.top;
        } else if (itemRect.bottom > listRect.bottom) {
            this.scroller[0].scrollTop += itemRect.bottom - listRect.bottom;
        }
    }

    mainWindowBlur() {
        this.emit('result', undefined);
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
        const itemEl = $(e.target).closest('.select-entry__item');
        const optionsClicked = $(e.target).closest('.select-entry__item-options').length;

        if (optionsClicked) {
            this.showItemOptions(itemEl, e);
        } else {
            const id = itemEl.data('id');
            this.result = this.entries.get(id);
            this.closeWithResult();
        }
    }

    itemRightClicked(e) {
        const itemEl = $(e.target).closest('.select-entry__item');
        this.showItemOptions(itemEl, e);
    }

    showItemOptions(itemEl, event) {
        if (event) {
            event.stopImmediatePropagation();
        }
        if (!this.model.itemOptions) {
            return;
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
        if (!itemEl.hasClass('select-entry__item--active')) {
            this.highlightActive();
        }

        const view = new DropdownView({ selectedOption: 0 });
        this.listenTo(view, 'cancel', this.hideItemOptionsDropdown);
        this.listenTo(view, 'select', this.itemOptionsDropdownSelect);

        const options = [];

        if (entry.fields.otp) {
            options.push({
                value: '{TOTP}',
                icon: 'clock',
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
            if (field !== 'otp' && !field.startsWith(ExtraUrlFieldName)) {
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

    showAndGetResult() {
        this.render();
        return new Promise((resolve) => {
            this.once('result', (result) => {
                this.remove();
                resolve(result);
            });
        });
    }

    filterClicked(e) {
        const filterEl = e.target.closest('.select-entry__filter');
        const filter = filterEl.dataset.filter;
        const active = filterEl.dataset.active !== 'true';

        switch (filter) {
            case 'url':
                this.model.filter.useUrl = active;
                break;
            case 'subdomains':
                this.model.filter.subdomains = active;
                if (active) {
                    this.model.filter.useUrl = true;
                }
                break;
            case 'title':
                this.model.filter.useTitle = active;
                break;
            case 'text':
                if (!active) {
                    this.model.filter.text = '';
                }
                break;
        }

        this.render();
    }

    cancelClicked() {
        this.cancelAndClose();
    }
}

Object.assign(SelectEntryView.prototype, Scrollable);

export { SelectEntryView };
