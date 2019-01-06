const Backbone = require('backbone');
const Alerts = require('./alerts');
const Launcher = require('./launcher');
const AuthReceiver = require('./auth-receiver');
const Links = require('../const/links');
const Timeouts = require('../const/timeouts');
const Locale = require('../util/locale');
const Logger = require('../util/logger');

const PopupNotifier = {
    logger: null,

    init: function() {
        this.logger = new Logger('popup-notifier');

        if (Launcher) {
            window.open = this._openLauncherWindow.bind(this);
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
            if (settingsObj.width) { opts.width = +settingsObj.width; }
            if (settingsObj.height) { opts.height = +settingsObj.height; }
            if (settingsObj.top) { opts.y = +settingsObj.top; }
            if (settingsObj.left) { opts.x = +settingsObj.left; }
        }
        let win = Launcher.openWindow(opts);
        win.webContents.on('will-redirect', (e, url) => {
            if (PopupNotifier.isOwnUrl(url)) {
                win.webContents.stop();
                win.close();
                PopupNotifier.processReturnToApp(url);
            }
        });
        win.webContents.on('will-navigate', (e, url) => {
            if (PopupNotifier.isOwnUrl(url)) {
                e.preventDefault();
                win.close();
                PopupNotifier.processReturnToApp(url);
            }
        });
        win.webContents.on('crashed', (e, killed) => {
            this.logger.debug('crashed', e, killed);
            this.deferCheckClosed(win);
            win.close();
            win = null;
        });
        win.webContents.on('did-fail-load', (e, errorCode, errorDescription, validatedUrl, isMainFrame) => {
            this.logger.debug('did-fail-load', e, errorCode, errorDescription, validatedUrl, isMainFrame);
            this.deferCheckClosed(win);
            win.close();
            win = null;
        });
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
        win.loadURL(url);
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
