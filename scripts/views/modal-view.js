import { View } from 'framework/views/view';
import { Launcher } from 'comp/launcher';
import { Keys } from 'const/keys';
import template from 'templates/modal.hbs';

class ModalView extends View {
    parent = 'body';
    modal = 'alert';

    template = template;

    events = {
        'click .modal__buttons button': 'buttonClick',
        'click .modal__link': 'linkClick',
        'click': 'bodyClick'
    };

    constructor(model) {
        super(model);
        if (typeof this.model.esc === 'string') {
            this.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, false, 'alert');
        }
        if (typeof this.model.enter === 'string') {
            this.onKey(Keys.DOM_VK_RETURN, this.enterPressed, false, 'alert');
        }
        this.once('remove', () => {
            if (this.model.view) {
                this.model.view.remove();
            }
        });
    }

    render() {
        super.render({
            ...this.model,
            body: this.model.body ? this.model.body.toString().split('\n') : ''
        });
        this.$el.addClass('modal--hidden');
        setTimeout(() => {
            this.$el.removeClass('modal--hidden');
            document.activeElement.blur();
        }, 20);
        if (this.model.view) {
            this.model.view.parent = this.el.querySelector('.modal__body');
            this.model.view.render();
        }
    }

    change(config) {
        if (config.header) {
            this.$el.find('.modal__header').text(config.header);
        }
    }

    buttonClick(e) {
        const result = $(e.target).data('result');
        this.closeWithResult(result);
    }

    linkClick(e) {
        if (Launcher) {
            e.preventDefault();
            Launcher.openLink(e.target.href);
        }
    }

    bodyClick(e) {
        if (typeof this.model.click === 'string' && !e.target.matches('button')) {
            this.closeWithResult(this.model.click);
        }
    }

    escPressed() {
        this.closeWithResult(this.model.esc);
    }

    enterPressed(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
        this.closeWithResult(this.model.enter);
    }

    closeWithResult(result) {
        const checked = this.model.checkbox
            ? this.$el.find('#modal__check').is(':checked')
            : undefined;
        this.emit('will-close');
        this.emit('result', result, checked);
        this.removeView();
    }

    closeWithoutResult() {
        this.emit('will-close');
        this.removeView();
    }

    removeView() {
        this.$el.addClass('modal--hidden');
        this.unbindEvents();
        setTimeout(() => this.remove(), 100);
    }

    closeImmediate() {
        this.emit('will-close');
        this.emit('result', undefined);
        this.unbindEvents();
        this.remove();
    }
}

export { ModalView };
