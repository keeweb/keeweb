'use strict';

const Backbone = require('backbone');
const AppSettingsModel = require('../models/app-settings-model');

let IdleTracker = {
    idleTimeout: 0,
    init: function() {
        this.scheduleLock();
    },
    scheduleLock() {
        let idleMinutes = AppSettingsModel.instance.get('idleMinutes');
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
        }
        this.idleTimeout = setTimeout(this.triggerIdle, idleMinutes * 60 * 1000);
    },
    triggerIdle() {
        Backbone.trigger('user-idle');
    },
    regUserAction() {
        this.scheduleLock();
    }
};

module.exports = IdleTracker;
