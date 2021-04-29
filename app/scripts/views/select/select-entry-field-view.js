import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import { Keys } from 'const/keys';
import { Scrollable } from 'framework/views/scrollable';
import template from 'templates/select/select-entry-field.hbs';

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
        this.initScroll();
        this.listenTo(Events, 'main-window-blur', this.mainWindowBlur);
        this.setupKeys();
    }

    setupKeys() {
        this.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, false, 'select-entry-field');
        this.onKey(Keys.DOM_VK_RETURN, this.enterPressed, false, 'select-entry-field');
    }

    render() {
        super.render(this.model);

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

    cancelAndClose() {
        this.result = null;
        this.emit('result', this.result);
    }

    escPressed() {
        this.cancelAndClose();
    }

    enterPressed() {
        this.closeWithResult();
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
        this.cancelAndClose();
    }
}

Object.assign(SelectEntryFieldView.prototype, Scrollable);

export { SelectEntryFieldView };
