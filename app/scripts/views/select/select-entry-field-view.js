import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import { Keys } from 'const/keys';
import { Scrollable } from 'framework/views/scrollable';
import template from 'templates/select/select-entry-field.hbs';
import { PasswordPresenter } from 'util/formatting/password-presenter';

class SelectEntryFieldView extends View {
    parent = 'body';
    modal = 'select-entry-field';

    template = template;

    events = {
        'click .select-entry-field__item': 'itemClicked',
        'click .select-entry-field__cancel-btn': 'cancelClicked'
    };

    result = null;

    constructor(model) {
        super(model);

        this.fields = this.model.entry ? this.getFields(this.model.entry) : [];
        this.activeField = this.fields[0]?.field;

        this.initScroll();
        this.listenTo(Events, 'main-window-blur', this.mainWindowBlur);
        this.setupKeys();
    }

    setupKeys() {
        this.onKey(Keys.DOM_VK_UP, this.upPressed, false, 'select-entry-field');
        this.onKey(Keys.DOM_VK_DOWN, this.downPressed, false, 'select-entry-field');
        this.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, false, 'select-entry-field');
        this.onKey(Keys.DOM_VK_RETURN, this.enterPressed, false, 'select-entry-field');
    }

    render() {
        super.render({
            needsTouch: this.model.needsTouch,
            deviceShortName: this.model.deviceShortName,
            fields: this.fields,
            activeField: this.activeField
        });

        document.activeElement.blur();

        const scrollRoot = this.el.querySelector('.select-entry-field__items');
        if (scrollRoot) {
            this.createScroll({
                root: scrollRoot,
                scroller: this.el.querySelector('.scroller'),
                bar: this.el.querySelector('.scroller__bar')
            });
        }
    }

    getFields(entry) {
        return Object.entries(entry.getAllFields())
            .map(([field, value]) => ({
                field,
                value
            }))
            .filter(({ value }) => value)
            .map(({ field, value }) => ({
                field,
                value: value.isProtected ? PasswordPresenter.present(value.length) : value
            }));
    }

    upPressed(e) {
        e.preventDefault();
        if (!this.activeField) {
            return;
        }

        const activeIndex = this.fields.findIndex((f) => f.field === this.activeField) - 1;
        if (activeIndex >= 0) {
            this.activeField = this.fields[activeIndex].field;
            this.render();
        }
    }

    downPressed(e) {
        e.preventDefault();
        if (!this.activeField) {
            return;
        }

        const activeIndex = this.fields.findIndex((f) => f.field === this.activeField) + 1;
        if (activeIndex < this.fields.length) {
            this.activeField = this.fields[activeIndex].field;
            this.render();
        }
    }

    escPressed() {
        this.emit('result', undefined);
    }

    enterPressed() {
        if (!this.activeField) {
            return;
        }

        this.emit('result', this.activeField);
    }

    itemClicked(e) {
        const item = e.target.closest('.select-entry-field__item');
        this.activeField = item.dataset.field;

        this.emit('result', this.activeField);
    }

    mainWindowBlur() {
        this.emit('result', undefined);
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

    cancelClicked() {
        this.emit('result', undefined);
    }
}

Object.assign(SelectEntryFieldView.prototype, Scrollable);

export { SelectEntryFieldView };
