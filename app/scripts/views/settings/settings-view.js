const Backbone = require('backbone');
const Scrollable = require('../../mixins/scrollable');
const Keys = require('../../const/keys');
const KeyHandler = require('../../comp/key-handler');

const SettingsView = Backbone.View.extend({
    template: require('templates/settings/settings.hbs'),

    views: null,

    events: {
        'click .settings__back-button': 'returnToApp'
    },

    initialize: function () {
        this.initScroll();
        this.listenTo(Backbone, 'set-page', this.setPage);
        this.views = { };
        KeyHandler.onKey(Keys.DOM_VK_ESCAPE, this.returnToApp, this);
    },

    remove: function() {
        KeyHandler.offKey(Keys.DOM_VK_ESCAPE, this.returnToApp, this);
        Backbone.View.prototype.remove.call(this);
    },

    render: function () {
        this.renderTemplate();
        this.createScroll({
            root: this.$el.find('.settings')[0],
            scroller: this.$el.find('.scroller')[0],
            bar: this.$el.find('.scroller__bar')[0]
        });
        this.pageEl = this.$el.find('.scroller');
        return this;
    },

    setPage: function (e) {
        const SettingsPageView = require('./settings-' + e.page + '-view');
        if (this.views.page) {
            this.views.page.remove();
        }
        this.views.page = new SettingsPageView({ el: this.pageEl, model: e.file });
        this.views.page.appModel = this.model;
        this.views.page.render();
        this.file = e.file;
        this.page = e.page;
        this.pageResized();
    },

    returnToApp: function() {
        Backbone.trigger('toggle-settings', false);
    }
});

_.extend(SettingsView.prototype, Scrollable);

module.exports = SettingsView;
