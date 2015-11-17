'use strict';

var Backbone = require('backbone'),
    AppSettingsModel = require('../models/app-settings-model');

var IdleTracker = {
    idleMinutes: 0,
    init: function() {
        setInterval(this.minuteTick.bind(this), 1000 * 60);
    },
    minuteTick: function() {
        if (++this.idleMinutes === AppSettingsModel.instance.get('idleMinutes')) {
            Backbone.trigger('user-idle');
        }
    },
    regUserAction: function() {
        this.idleMinutes = 0;
    }
};

module.exports = IdleTracker;
