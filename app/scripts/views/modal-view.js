import Backbone from 'backbone';
import { KeyHandler } from 'comp/browser/key-handler';
import { Keys } from 'const/keys';

const ModalView = Backbone.View.extend({
    el: 'body',

    template: require('templates/modal.hbs'),

    events: {
        'click .modal__buttons button': 'buttonClick',
        'click': 'bodyClick'
    },

    initialize() {
        if (typeof this.model.esc === 'string') {
            KeyHandler.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, this, false, 'alert');
        }
        if (typeof this.model.enter === 'string') {
            KeyHandler.onKey(Keys.DOM_VK_RETURN, this.enterPressed, this, false, 'alert');
        }
        KeyHandler.setModal('alert');
    },

    remove() {
        KeyHandler.offKey(Keys.DOM_VK_ESCAPE, this.escPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_RETURN, this.enterPressed, this);
        KeyHandler.setModal(null);
        if (this.model.view) {
            this.model.view.remove();
        }
        Backbone.View.prototype.remove.apply(this);
    },

    render() {
        const parent = this.$el;
        this.setElement($(this.template(this.model)));
        parent.append(this.$el);
        const el = this.$el;
        el.addClass('modal--hidden');
        setTimeout(() => {
            el.removeClass('modal--hidden');
            document.activeElement.blur();
        }, 20);
        if (this.model.view) {
            this.model.view.setElement(this.$el.find('.modal__body'));
            this.model.view.render();
        }
        return this;
    },

    change(config) {
        if (config.header) {
            this.$el.find('.modal__header').html(config.header);
        }
    },

    buttonClick(e) {
        const result = $(e.target).data('result');
        this.closeWithResult(result);
    },

    bodyClick() {
        if (typeof this.model.click === 'string') {
            this.closeWithResult(this.model.click);
        }
    },

    escPressed() {
        this.closeWithResult(this.model.esc);
    },

    enterPressed(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
        this.closeWithResult(this.model.enter);
    },

    closeWithResult(result) {
        const checked = this.model.checkbox
            ? this.$el.find('#modal__check').is(':checked')
            : undefined;
        this.trigger('result', result, checked);
        this.$el.addClass('modal--hidden');
        this.undelegateEvents();
        setTimeout(this.remove.bind(this), 100);
    },

    closeImmediate() {
        this.trigger('result', undefined);
        this.undelegateEvents();
        this.remove();
    }
});

export { ModalView };
