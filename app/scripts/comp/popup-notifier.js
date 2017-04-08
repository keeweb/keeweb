const Backbone = require('backbone');
const Alerts = require('./alerts');
const Launcher = require('./launcher');
const AuthReceiver = require('./auth-receiver');
const Links = require('../const/links');
const Timeouts = require('../const/timeouts');
const Locale = require('../util/locale');

const PopupNotifier = {
    init: function() {
        if (Launcher) {
            window.open = this._openLauncherWindow;
        } else {
            const windowOpen = window.open;
            window.open = function() {
                const win = windowOpen.apply(window, arguments);
                if (win) {
                    PopupNotifier.deferCheckClosed(win);
                    Backbone.trigger('popup-opened', win);
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

    _openLauncherWindow: function(url, title, settings) {
        const opts = {
            show: false,
            webPreferences: {
                nodeIntegration: false,
                webSecurity: false,
                allowDisplayingInsecureContent: true,
                allowRunningInsecureContent: true
            }
        };
        if (settings) {
            const settingsObj = {};
            settings.split(',').forEach(part => {
                const parts = part.split('=');
                settingsObj[parts[0].trim()] = parts[1].trim();
            });
            if (settings.width) { opts.width = settings.width; }
            if (settings.height) { opts.height = settings.height; }
            if (settings.top) { opts.y = settings.top; }
            if (settings.left) { opts.x = settings.left; }
        }
        let win = Launcher.openWindow(opts);
        win.webContents.on('did-get-redirect-request', (e, fromUrl, toUrl) => {
            if (PopupNotifier.isOwnUrl(toUrl)) {
                win.webContents.stop();
                win.close();
                PopupNotifier.processReturnToApp(toUrl);
            }
        });
        win.webContents.on('will-navigate', (e, toUrl) => {
            if (PopupNotifier.isOwnUrl(toUrl)) {
                e.preventDefault();
                win.close();
                PopupNotifier.processReturnToApp(toUrl);
            }
        });
        win.loadURL(url);
        win.once('page-title-updated', () => {
            setTimeout(() => {
                if (win) {
                    win.show();
                    win.focus();
                }
            }, Timeouts.PopupWaitTime);
        });
        win.on('closed', () => {
            setTimeout(PopupNotifier.triggerClosed.bind(PopupNotifier, win), Timeouts.CheckWindowClosed);
            win = null;
        });
        Backbone.trigger('popup-opened', win);
        return win;
    },

    isOwnUrl(url) {
        return url.lastIndexOf(Links.WebApp, 0) === 0 ||
            url.lastIndexOf(location.origin + location.pathname, 0) === 0;
    },

    processReturnToApp: function(url) {
        const returnMessage = AuthReceiver.urlArgsToMessage(url);
        if (Object.keys(returnMessage).length > 0) {
            const evt = new Event('message');
            evt.data = returnMessage;
            window.dispatchEvent(evt);
        }
    },

    deferCheckClosed: function(win) {
        setTimeout(PopupNotifier.checkClosed.bind(PopupNotifier, win), Timeouts.CheckWindowClosed);
    },

    checkClosed: function(win) {
        if (win.closed) {
            setTimeout(PopupNotifier.triggerClosed.bind(PopupNotifier, win), Timeouts.CheckWindowClosed);
        } else {
            PopupNotifier.deferCheckClosed(win);
        }
    },

    triggerClosed: function(win) {
        Backbone.trigger('popup-closed', win);
    }
};

module.exports = PopupNotifier;
