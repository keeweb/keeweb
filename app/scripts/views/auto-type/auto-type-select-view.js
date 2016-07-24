'use strict';

const Backbone = require('backbone');
const Keys = require('../../const/keys');
const KeyHandler = require('../../comp/key-handler');

let AutoTypePopupView = Backbone.View.extend({
    el: 'body',

    template: require('templates/auto-type/auto-type-select.hbs'),

    events: {
        'click .at-select__header-filter-clear': 'clearFilterText'
    },

    result: null,

    initialize() {
        this.listenTo(Backbone, 'main-window-blur', this.mainWindowBlur);
        KeyHandler.onKey(Keys.DOM_VK_ESCAPE, this.escPressed, this, false, true);
        KeyHandler.onKey(Keys.DOM_VK_RETURN, this.enterPressed, this, false, true);
        KeyHandler.onKey(Keys.DOM_VK_UP, this.upPressed, this, false, true);
        KeyHandler.onKey(Keys.DOM_VK_DOWN, this.downPressed, this, false, true);
        KeyHandler.onKey(Keys.DOM_VK_BACK_SPACE, this.backSpacePressed, this, false, true);
        KeyHandler.on('keypress:auto-type', this.keyPressed.bind(this));
        KeyHandler.setModal('auto-type');
    },

    render() {
        this.renderTemplate({
            filterText: this.model.filter.text
        });
        document.activeElement.blur();
        return this;
    },

    remove() {
        KeyHandler.offKey(Keys.DOM_VK_ESCAPE, this.escPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_RETURN, this.enterPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_UP, this.upPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_DOWN, this.downPressed, this);
        KeyHandler.offKey(Keys.DOM_VK_BACK_SPACE, this.backSpacePressed, this);
        KeyHandler.off('keypress:auto-type');
        KeyHandler.setModal(null);
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    cancelAndClose() {
        this.result = null;
        this.trigger('result', this.result);
    },

    escPressed() {
        this.cancelAndClose();
    },

    enterPressed() {
        this.trigger('result', this.result);
    },

    upPressed() {
    },

    downPressed() {
    },

    keyPressed(e) {
        if (e.which) {
            this.model.filter.text += String.fromCharCode(e.which);
            this.render();
        }
    },

    backSpacePressed() {
        if (this.model.filter.text) {
            this.model.filter.text = this.model.filter.text.substr(0, this.model.filter.text.length - 1);
            this.render();
        }
    },

    clearFilterText() {
        this.model.filter.text = '';
        this.render();
    },

    mainWindowBlur() {
        this.cancelAndClose();
    }
});

module.exports = AutoTypePopupView;
