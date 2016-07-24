'use strict';

const Backbone = require('backbone');
const Keys = require('../../const/keys');
const KeyHandler = require('../../comp/key-handler');

let AutoTypePopupView = Backbone.View.extend({
    el: 'body',

    template: require('templates/auto-type/auto-type-select.hbs'),

    events: {
    },

    result: null,

    initialize() {
        KeyHandler.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, this, false, true);
        KeyHandler.onKey(Keys.DOM_VK_RETURN, this.enterPressed, this, false, true);
        KeyHandler.onKey(Keys.DOM_VK_UP, this.upPressed, this, false, true);
        KeyHandler.onKey(Keys.DOM_VK_DOWN, this.downPressed, this, false, true);
        KeyHandler.on('keypress:auto-type', this.keyPressed.bind(this));
        KeyHandler.setModal('auto-type');
    },

    render() {
        this.renderTemplate(this.model);
        document.activeElement.blur();
        return this;
    },

    remove() {
        KeyHandler.offKey(Keys.DOM_VK_ESCAPE, this.escPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_RETURN, this.enterPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_UP, this.upPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_DOWN, this.downPressed, this);
        KeyHandler.off('keypress:auto-type');
        KeyHandler.setModal(null);
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    escPressed() {
        this.result = null;
        this.trigger('result', this.result);
    },

    enterPressed() {
        this.trigger('result', this.result);
    },

    upPressed() {
    },

    downPressed() {
    },

    keyPressed(e) {
        // let char = e.charCode;
    }
});

module.exports = AutoTypePopupView;
