'use strict';

var Backbone = require('backbone'),
    Keys = require('../const/keys'),
    KeyHandler = require('../util/key-handler'),
    GeneratorView = require('./generator-view');

var FooterView = Backbone.View.extend({
    template: require('templates/footer.html'),

    events: {
        'click .footer__db-item': 'showFile',
        'click .footer__db-open': 'openFile',
        'click .footer__btn-view': 'switchView',
        'click .footer__btn-settings': 'toggleSettings',
        'click .footer__btn-generate': 'genPass',
        'click .footer__btn-lock': 'lockWorkspace'
    },

    initialize: function () {
        KeyHandler.onKey(Keys.DOM_VK_L, this.lockWorkspace, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.onKey(Keys.DOM_VK_G, this.genPass, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.onKey(Keys.DOM_VK_O, this.openFile, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.onKey(Keys.DOM_VK_S, this.saveAll, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.onKey(Keys.DOM_VK_COMMA, this.toggleSettings, this, KeyHandler.SHORTCUT_ACTION);

        this.listenTo(this.model.files, 'update reset', this.render);
    },

    render: function () {
        this.$el.html(this.template(this.model));
        return this;
    },

    lockWorkspace: function() {
        Backbone.trigger('lock-workspace');
    },

    genPass: function() {
        var el = this.$el.find('.footer__btn-generate'),
            rect = el[0].getBoundingClientRect(),
            bodyRect = document.body.getBoundingClientRect(),
            right = bodyRect.right - rect.right,
            bottom = bodyRect.bottom - rect.top;
        var generator = new GeneratorView({ model: { pos: { right: right, bottom: bottom } } });
        generator.render();
    },

    showFile: function(e) {
        var fileId = $(e.target).closest('.footer__db-item').data('file-id');
        if (fileId) {
            Backbone.trigger('show-file', { fileId: fileId });
        }
    },

    openFile: function() {
        Backbone.trigger('open-file');
    },

    saveAll: function() {
        Backbone.trigger('save-all');
    },

    switchView: function() {
        Backbone.trigger('switch-view');
    },

    toggleSettings: function() {
        Backbone.trigger('toggle-settings');
    }
});

module.exports = FooterView;
