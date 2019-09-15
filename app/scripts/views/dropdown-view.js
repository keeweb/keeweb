import Backbone from 'backbone';
import { KeyHandler } from 'comp/browser/key-handler';
import { Keys } from 'const/keys';

const DropdownView = Backbone.View.extend({
    template: require('templates/dropdown.hbs'),

    events: {
        'click .dropdown__item': 'itemClick'
    },

    initialize() {
        Backbone.trigger('dropdown-shown');
        this.bodyClick = this.bodyClick.bind(this);

        this.listenTo(Backbone, 'show-context-menu dropdown-shown', this.bodyClick);
        $('body').on('click contextmenu keydown', this.bodyClick);

        KeyHandler.onKey(Keys.DOM_VK_UP, this.upPressed, this, false, 'dropdown');
        KeyHandler.onKey(Keys.DOM_VK_DOWN, this.downPressed, this, false, 'dropdown');
        KeyHandler.onKey(Keys.DOM_VK_RETURN, this.enterPressed, this, false, 'dropdown');
        KeyHandler.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, this, false, 'dropdown');

        this.prevModal = KeyHandler.modal === 'dropdown' ? undefined : KeyHandler.modal;
        KeyHandler.setModal('dropdown');
    },

    render(config) {
        this.options = config.options;
        this.renderTemplate(config);
        this.$el.appendTo(document.body);
        const ownRect = this.$el[0].getBoundingClientRect();
        const bodyRect = document.body.getBoundingClientRect();
        let left = config.position.left || config.position.right - ownRect.right + ownRect.left;
        let top = config.position.top;
        if (left + ownRect.width > bodyRect.right) {
            left = Math.max(0, bodyRect.right - ownRect.width);
        }
        if (top + ownRect.height > bodyRect.bottom) {
            top = Math.max(0, bodyRect.bottom - ownRect.height);
        }
        this.$el.css({ top, left });
        return this;
    },

    remove() {
        this.viewRemoved = true;

        $('body').off('click contextmenu keydown', this.bodyClick);

        KeyHandler.offKey(Keys.DOM_VK_UP, this.upPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_DOWN, this.downPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_RETURN, this.enterPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_ESCAPE, this.escPressed, this);

        if (KeyHandler.modal === 'dropdown') {
            KeyHandler.setModal(this.prevModal);
        }

        Backbone.View.prototype.remove.apply(this);
    },

    bodyClick(e) {
        if (
            [Keys.DOM_VK_UP, Keys.DOM_VK_DOWN, Keys.DOM_VK_RETURN, Keys.DOM_VK_ESCAPE].includes(
                e.which
            )
        ) {
            return;
        }
        if (!this.viewRemoved) {
            this.trigger('cancel');
        }
    },

    itemClick(e) {
        e.stopPropagation();
        const el = $(e.target).closest('.dropdown__item');
        const selected = el.data('value');
        this.trigger('select', { item: selected, el });
    },

    upPressed(e) {
        e.preventDefault();
        if (!this.selectedOption) {
            this.selectedOption = this.options.length - 1;
        } else {
            this.selectedOption--;
        }
        this.renderSelectedOption();
    },

    downPressed(e) {
        e.preventDefault();
        if (this.selectedOption === undefined || this.selectedOption === this.options.length - 1) {
            this.selectedOption = 0;
        } else {
            this.selectedOption++;
        }
        this.renderSelectedOption();
    },

    renderSelectedOption() {
        this.$el.find('.dropdown__item').removeClass('dropdown__item--active');
        this.$el
            .find(`.dropdown__item:nth(${this.selectedOption})`)
            .addClass('dropdown__item--active');
    },

    enterPressed() {
        if (!this.viewRemoved && this.selectedOption !== undefined) {
            const el = this.$el.find(`.dropdown__item:nth(${this.selectedOption})`);
            const selected = el.data('value');
            this.trigger('select', { item: selected, el });
        }
    },

    escPressed(e) {
        e.stopImmediatePropagation();
        if (!this.viewRemoved) {
            this.trigger('cancel');
        }
    }
});

export { DropdownView };
