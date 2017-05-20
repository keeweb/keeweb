const Backbone = require('backbone');
const Keys = require('../const/keys');
const KeyHandler = require('../comp/key-handler');
const GeneratorView = require('./generator-view');
const UpdateModel = require('../models/update-model');

const FooterView = Backbone.View.extend({
    template: require('templates/footer.hbs'),

    events: {
        'click .footer__db-item': 'showFile',
        'click .footer__db-open': 'openFile',
        'click .footer__btn-help': 'toggleHelp',
        'click .footer__btn-settings': 'toggleSettings',
        'click .footer__btn-generate': 'genPass',
        'click .footer__btn-lock': 'lockWorkspace'
    },

    initialize: function () {
        this.views = {};

        KeyHandler.onKey(Keys.DOM_VK_L, this.lockWorkspace, this, KeyHandler.SHORTCUT_ACTION, false, true);
        KeyHandler.onKey(Keys.DOM_VK_G, this.genPass, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.onKey(Keys.DOM_VK_O, this.openFile, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.onKey(Keys.DOM_VK_S, this.saveAll, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.onKey(Keys.DOM_VK_COMMA, this.toggleSettings, this, KeyHandler.SHORTCUT_ACTION);

        this.listenTo(this, 'hide', this.viewHidden);
        this.listenTo(this.model.files, 'update reset change', this.render);
        this.listenTo(Backbone, 'set-locale', this.render);
        this.listenTo(UpdateModel.instance, 'change:updateStatus', this.render);
    },

    render: function () {
        this.renderTemplate({
            files: this.model.files,
            updateAvailable: ['ready', 'found'].indexOf(UpdateModel.instance.get('updateStatus')) >= 0
        }, { plain: true });
        return this;
    },

    viewHidden: function() {
        if (this.views.gen) {
            this.views.gen.remove();
            delete this.views.gen;
        }
    },

    lockWorkspace: function(e) {
        if (this.model.files.hasOpenFiles()) {
            e.preventDefault();
            Backbone.trigger('lock-workspace');
        }
    },

    genPass: function(e) {
        e.stopPropagation();
        if (this.views.gen) {
            this.views.gen.remove();
            return;
        }
        const el = this.$el.find('.footer__btn-generate');
        const rect = el[0].getBoundingClientRect();
        const bodyRect = document.body.getBoundingClientRect();
        const right = bodyRect.right - rect.right;
        const bottom = bodyRect.bottom - rect.top;
        const generator = new GeneratorView({ model: { copy: true, pos: { right: right, bottom: bottom } } }).render();
        generator.once('remove', () => { delete this.views.gen; });
        this.views.gen = generator;
    },

    showFile: function(e) {
        const fileId = $(e.target).closest('.footer__db-item').data('file-id');
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

    toggleHelp: function() {
        Backbone.trigger('toggle-settings', 'help');
    },

    toggleSettings: function() {
        Backbone.trigger('toggle-settings', 'general');
    }
});

module.exports = FooterView;
