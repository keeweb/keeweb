import { Events } from 'framework/events';
import { Launcher } from 'comp/launcher';
import { Alerts } from 'comp/ui/alerts';
import { Timeouts } from 'const/timeouts';
import { Locale } from 'util/locale';
import { Logger } from 'util/logger';
import { noop } from 'util/fn';

const PopupNotifier = {
    logger: null,

    init() {
        this.logger = new Logger('popup-notifier');

        if (Launcher) {
            window.open = noop;
        } else {
            const windowOpen = window.open;
            window.open = function (...args) {
                const win = windowOpen.apply(window, args);
                if (win) {
                    PopupNotifier.deferCheckClosed(win);
                    Events.emit('popup-opened', win);
                } else {
                    if (!Alerts.alertDisplayed) {
                        Alerts.error({
                            header: Locale.authPopupRequired,
                            body: Locale.authPopupRequiredBody
                        });
                    }
                }
                return win;
            };
        }
    },

    deferCheckClosed(win) {
        setTimeout(PopupNotifier.checkClosed.bind(PopupNotifier, win), Timeouts.CheckWindowClosed);
    },

    checkClosed(win) {
        if (win.closed) {
            setTimeout(
                PopupNotifier.triggerClosed.bind(PopupNotifier, win),
                Timeouts.CheckWindowClosed
            );
        } else {
            const loc = PopupNotifier.tryGetLocationSearch(win);
            if (loc) {
                try {
                    win.close();
                } catch {}
                PopupNotifier.triggerClosed(win, loc);
                return;
            }
            PopupNotifier.deferCheckClosed(win);
        }
    },

    tryGetLocationSearch(win) {
        try {
            if (win.location.host === location.host) {
                return win.location.search;
            }
        } catch {}
    },

    triggerClosed(window, locationSearch) {
        Events.emit('popup-closed', { window, locationSearch });
    }
};

export { PopupNotifier };
