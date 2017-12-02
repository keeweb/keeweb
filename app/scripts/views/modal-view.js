const Backbone = require('backbone');
const Keys = require('../const/keys');
const KeyHandler = require('../comp/key-handler');

const ModalView = Backbone.View.extend({
    el: 'body',

    template: require('templates/modal.hbs'),

    events: {
        'click .modal__buttons button': 'buttonClick',
        'click': 'bodyClick'
    },

    initialize: function () {
        if (typeof this.model.esc === 'string') {
            KeyHandler.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, this, false, true);
        }
        if (typeof this.model.enter === 'string') {
            KeyHandler.onKey(Keys.DOM_VK_RETURN, this.enterPressed, this, false, true);
        }
        KeyHandler.setModal('alert');
    },

    remove: function() {
        KeyHandler.offKey(Keys.DOM_VK_ESCAPE, this.escPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_RETURN, this.enterPressed, this);
        KeyHandler.setModal(null);
        if (this.model.view) {
            this.model.view.remove();
        }
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    render: function () {
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

    change: function(config) {
        if (config.header) {
            this.$el.find('.modal__header').html(config.header);
        }
    },

    buttonClick: function(e) {
        const result = $(e.target).data('result');
        this.closeWithResult(result);
    },

    bodyClick: function() {
        if (typeof this.model.click === 'string') {
            this.closeWithResult(this.model.click);
        }
    },

    escPressed: function() {
        this.closeWithResult(this.model.esc);
    },

    enterPressed: function(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
        this.closeWithResult(this.model.enter);
    },

    closeWithResult: function(result) {
        const checked = this.model.checkbox ? this.$el.find('#modal__check').is(':checked') : undefined;
        this.trigger('result', result, checked);
        this.$el.addClass('modal--hidden');
        this.undelegateEvents();
        setTimeout(this.remove.bind(this), 100);
    },

    closeImmediate: function() {
        this.trigger('result', undefined);
        this.undelegateEvents();
        this.remove();
    }
});

module.exports = ModalView;
