import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import { Keys } from 'const/keys';
import { Scrollable } from 'framework/views/scrollable';
import { StringFormat } from 'util/formatting/string-format';
import template from 'templates/settings/settings.hbs';

class SettingsView extends View {
    parent = '.app__body';

    template = template;

    events = {
        'click .settings__back-button': 'returnToApp'
    };

    constructor(model, options) {
        super(model, options);
        this.initScroll();
        this.listenTo(Events, 'set-page', this.setPage);
        this.onKey(Keys.DOM_VK_ESCAPE, this.returnToApp);
    }

    render() {
        super.render();
        this.createScroll({
            root: this.$el.find('.settings')[0],
            scroller: this.$el.find('.scroller')[0],
            bar: this.$el.find('.scroller__bar')[0]
        });
        this.pageEl = this.$el.find('.scroller');
    }

    setPage(e) {
        const module = require('./settings-' + e.page + '-view');
        const viewName = StringFormat.capFirst(e.page);
        const SettingsPageView = module[`Settings${viewName}View`];
        if (this.views.page) {
            this.views.page.remove();
        }
        this.views.page = new SettingsPageView(e.file, { parent: this.pageEl[0] });
        this.views.page.appModel = this.model;
        this.views.page.render();
        this.file = e.file;
        this.page = e.page;
        this.pageResized();
    }

    returnToApp() {
        Events.emit('toggle-settings', false);
    }
}

Object.assign(SettingsView.prototype, Scrollable);

export { SettingsView };
