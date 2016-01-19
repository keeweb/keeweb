'use strict';

var Backbone = require('backbone'),
    Keys = require('../const/keys'),
    KeyHandler = require('../comp/key-handler');

var ModalView = Backbone.View.extend({
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
        KeyHandler.setModal(true);
    },

    remove : function() {
        KeyHandler.offKey(Keys.DOM_VK_ESCAPE, this.escPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_RETURN, this.enterPressed, this);
        KeyHandler.setModal(false);
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    render: function () {
        var parent = this.$el;
        this.setElement($(this.template(this.model)));
        parent.append(this.$el);
        var el = this.$el;
        el.addClass('modal--hidden');
        setTimeout(function() {
            el.removeClass('modal--hidden');
        }, 20);
        return this;
    },

    buttonClick: function(e) {
        var result = $(e.target).data('result');
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
        var checked = this.model.checkbox ? this.$el.find('#modal__check').is(':checked') : undefined;
        this.trigger('result', result, checked);
        this.$el.addClass('modal--hidden');
        this.undelegateEvents();
        setTimeout(this.remove.bind(this), 100);
    }
});

module.exports = ModalView;
