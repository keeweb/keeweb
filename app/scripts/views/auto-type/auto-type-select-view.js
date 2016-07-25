'use strict';

const Backbone = require('backbone');
const Keys = require('../../const/keys');
const KeyHandler = require('../../comp/key-handler');
const Locale = require('../../util/locale');
const AppSettingsModel = require('../../models/app-settings-model');
const EntryPresenter = require('../../presenters/entry-presenter');
const Scrollable = require('../../mixins/scrollable');

let AutoTypePopupView = Backbone.View.extend({
    el: 'body',

    template: require('templates/auto-type/auto-type-select.hbs'),
    itemTemplate: require('templates/auto-type/auto-type-select-item.hbs'),

    events: {
        'click .at-select__header-filter-clear': 'clearFilterText',
        'click .at-select__message-clear-filter': 'clearFilterWindow'
    },

    result: null,

    initialize() {
        this.initScroll();
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
        let topMessage, topClearFilterVisible;
        if (this.model.filter.title || this.model.filter.url) {
            topMessage = Locale.autoTypeMsgMatchedByWindow.replace('{}',
                this.model.filter.title || this.model.filter.url);
            topClearFilterVisible = !this.model.filter.ignoreWindowInfo;
        } else {
            topMessage = Locale.autoTypeMsgNoWindow;
        }
        let noColor = AppSettingsModel.instance.get('colorfulIcons') ? '' : 'grayscale';
        let presenter = new EntryPresenter(null, noColor);
        let itemsHtml = '';
        let itemTemplate = this.itemTemplate;
        this.model.filter.getEntries().forEach(entry => {
            presenter.present(entry);
            itemsHtml += itemTemplate(presenter);
        });
        this.renderTemplate({
            filterText: this.model.filter.text,
            topMessage: topMessage,
            topClearFilterVisible: topClearFilterVisible,
            itemsHtml: itemsHtml
        });
        document.activeElement.blur();
        this.createScroll({
            root: this.$el.find('.at-select__items')[0],
            scroller: this.$el.find('.scroller')[0],
            bar: this.$el.find('.scroller__bar')[0]
        });
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
        if (this.model.filter.text) {
            this.clearFilterText();
        } else {
            this.cancelAndClose();
        }
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

    clearFilterWindow() {
        this.model.filter.ignoreWindowInfo = true;
        this.render();
    },

    mainWindowBlur() {
        this.cancelAndClose();
    }
});

_.extend(AutoTypePopupView.prototype, Scrollable);

module.exports = AutoTypePopupView;
