const Backbone = require('backbone');
const AppSettingsModel = require('../models/app-settings-model');

const IdleTracker = {
    actionTime: Date.now(),
    init: function() {
        setInterval(this.checkIdle.bind(this), 1000 * 60);
    },
    checkIdle: function() {
        const idleMinutes = (Date.now() - this.actionTime) / 1000 / 60;
        const maxIdleMinutes = AppSettingsModel.instance.get('idleMinutes');
        if (maxIdleMinutes && idleMinutes > maxIdleMinutes) {
            Backbone.trigger('user-idle');
        }
    },
    regUserAction: function() {
        this.actionTime = Date.now();
    }
};

Backbone.on('power-monitor-resume', IdleTracker.checkIdle, IdleTracker);

module.exports = IdleTracker;
