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
        let { page, section, file } = e;
        if (page === 'file' && file && file.backend === 'otp-device') {
            page = 'file-otp-device';
        }
        const module = require('./settings-' + page + '-view');
        const viewName = StringFormat.pascalCase(page);
        const SettingsPageView = module[`Settings${viewName}View`];
        if (this.views.page) {
            this.views.page.remove();
        }
        this.views.page = new SettingsPageView(file, { parent: this.pageEl[0] });
        this.views.page.appModel = this.model;
        this.views.page.render();
        this.file = file;
        this.page = page;
        this.pageResized();
        this.scrollToSection(section);
    }

    scrollToSection(section) {
        let scrollEl;
        if (section) {
            scrollEl = this.views.page.el.querySelector(`#${section}`);
        }
        if (!scrollEl) {
            scrollEl = this.views.page.el.querySelector(`h1`);
        }
        if (scrollEl) {
            scrollEl.scrollIntoView(true);
        }
    }

    returnToApp() {
        Events.emit('toggle-settings', false);
    }
}

Object.assign(SettingsView.prototype, Scrollable);

export { SettingsView };
