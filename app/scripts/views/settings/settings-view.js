import Backbone from 'backbone';
import { KeyHandler } from 'comp/browser/key-handler';
import { Keys } from 'const/keys';
import { Scrollable } from 'view-engine/scrollable';
import { StringFormat } from 'util/formatting/string-format';

const SettingsView = Backbone.View.extend({
    template: require('templates/settings/settings.hbs'),

    views: null,

    events: {
        'click .settings__back-button': 'returnToApp'
    },

    initialize() {
        this.initScroll();
        this.listenTo(Backbone, 'set-page', this.setPage);
        this.views = {};
        KeyHandler.onKey(Keys.DOM_VK_ESCAPE, this.returnToApp, this);
    },

    remove() {
        KeyHandler.offKey(Keys.DOM_VK_ESCAPE, this.returnToApp, this);
        Backbone.View.prototype.remove.call(this);
    },

    render() {
        this.renderTemplate();
        this.createScroll({
            root: this.$el.find('.settings')[0],
            scroller: this.$el.find('.scroller')[0],
            bar: this.$el.find('.scroller__bar')[0]
        });
        this.pageEl = this.$el.find('.scroller');
        return this;
    },

    setPage(e) {
        const module = require('./settings-' + e.page + '-view');
        const viewName = StringFormat.capFirst(e.page);
        const SettingsPageView = module[`Settings${viewName}View`];
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

    returnToApp() {
        Backbone.trigger('toggle-settings', false);
    }
});

_.extend(SettingsView.prototype, Scrollable);

export { SettingsView };
