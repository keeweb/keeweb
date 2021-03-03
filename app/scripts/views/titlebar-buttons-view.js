import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import { Launcher } from 'comp/launcher';
import template from 'templates/titlebar-buttons.hbs';

class TitlebarButtonsView extends View {
    parent = '.app__titlebar';

    template = template;

    events = {
        'click .titlebar-buttons-minimize': 'clickMinimize',
        'click .titlebar-buttons-maximize': 'clickMaximize',
        'click .titlebar-buttons-restore': 'clickRestore',
        'click .titlebar-buttons-close': 'clickClose'
    };

    constructor() {
        super();

        this.maximized = Launcher.mainWindowMaximized();

        this.listenTo(Events, 'app-maximized', this.appMaximized);
        this.listenTo(Events, 'app-unmaximized', this.appUnmaximized);
    }

    render() {
        super.render({
            maximized: this.maximized
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

export { TitlebarButtonsView };
