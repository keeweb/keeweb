'use strict';

var Backbone = require('backbone'),
    Timeouts = require('../const/timeouts');

var PopupNotifier = {
    init: function() {
        if (window.open) {
            var windowOpen = window.open;
            window.open = function() {
                var win = windowOpen.apply(window, arguments);
                if (win) {
                    PopupNotifier.deferCheckClosed(win);
                    Backbone.trigger('popup-opened', win);
                }
                return win;
            };
        }
    },

    deferCheckClosed: function(win) {
        setTimeout(PopupNotifier.checkClosed.bind(PopupNotifier, win), Timeouts.CheckWindowClosed);
    },

    checkClosed: function(win) {
        if (win.closed) {
            Backbone.trigger('popup-closed', win);
        } else {
            PopupNotifier.deferCheckClosed(win);
        }
    }
};

module.exports = PopupNotifier;
