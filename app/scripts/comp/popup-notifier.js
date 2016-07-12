'use strict';

var Backbone = require('backbone'),
    Alerts = require('./alerts'),
    Launcher = require('./launcher'),
    AuthReceiver = require('./auth-receiver'),
    Links = require('../const/links'),
    Timeouts = require('../const/timeouts'),
    Locale = require('../util/locale');

var PopupNotifier = {
    init: function() {
        if (Launcher) {
            window.open = this._openLauncherWindow;
        } else {
            var windowOpen = window.open;
            window.open = function() {
                var win = windowOpen.apply(window, arguments);
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
        var opts = {
            show: false,
            'web-preferences': {
                'node-integration': false,
                'web-security': false,
                'allow-displaying-insecure-content': true,
                'allow-running-insecure-content': true
            }
        };
        if (settings) {
            var settingsObj = {};
            settings.split(',').forEach(function(part) {
                var parts = part.split('=');
                settingsObj[parts[0].trim()] = parts[1].trim();
            });
            if (settings.width) { opts.width = settings.width; }
            if (settings.height) { opts.height = settings.height; }
            if (settings.top) { opts.y = settings.top; }
            if (settings.left) { opts.x = settings.left; }
        }
        var win = Launcher.openWindow(opts);
        win.webContents.on('did-get-redirect-request', function(e, fromUrl, toUrl) {
            if (toUrl.lastIndexOf(Links.WebApp, 0) === 0) {
                win.webContents.stop();
                win.close();
                PopupNotifier.processReturnToApp(toUrl);
            }
        });
        win.webContents.on('will-navigate', function(e, toUrl) {
            if (toUrl.lastIndexOf(Links.WebApp, 0) === 0) {
                e.preventDefault();
                win.close();
                PopupNotifier.processReturnToApp(toUrl);
            }
        });
        win.loadURL(url);
        win.show();
        win.on('closed', function() {
            setTimeout(PopupNotifier.triggerClosed.bind(PopupNotifier, win), Timeouts.CheckWindowClosed);
        });
        Backbone.trigger('popup-opened', win);
        return win;
    },

    processReturnToApp: function(url) {
        var returnMessage = AuthReceiver.urlArgsToMessage(url);
        if (Object.keys(returnMessage).length > 0) {
            var evt = new Event('message');
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
