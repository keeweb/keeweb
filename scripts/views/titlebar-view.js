import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import { Launcher } from 'comp/launcher';
import { KeeWebLogo } from 'const/inline-images';
import template from 'templates/titlebar.hbs';

class TitlebarView extends View {
    parent = '.app__titlebar';

    template = template;

    events = {
        'click .titlebar__minimize': 'clickMinimize',
        'click .titlebar__maximize': 'clickMaximize',
        'click .titlebar__restore': 'clickRestore',
        'click .titlebar__close': 'clickClose'
    };

    constructor() {
        super();

        this.maximized = Launcher.mainWindowMaximized();

        this.listenTo(Events, 'app-maximized', this.appMaximized);
        this.listenTo(Events, 'app-unmaximized', this.appUnmaximized);
    }

    render() {
        super.render({
            maximized: this.maximized,
            iconSrc: KeeWebLogo
        });
    }

    clickMinimize() {
        Launcher.minimizeMainWindow();
    }

    clickMaximize() {
        Launcher.maximizeMainWindow();
    }

    clickRestore() {
        Launcher.restoreMainWindow();
    }

    clickClose() {
        window.close();
    }

    appMaximized() {
        this.maximized = true;
        this.render();
    }

    appUnmaximized() {
        this.maximized = false;
        this.render();
    }
}

export { TitlebarView };
