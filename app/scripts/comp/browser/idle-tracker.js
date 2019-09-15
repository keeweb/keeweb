import Backbone from 'backbone';
import { AppSettingsModel } from 'models/app-settings-model';

const IdleTracker = {
    actionTime: Date.now(),
    init() {
        setInterval(this.checkIdle.bind(this), 1000 * 60);
    },
    checkIdle() {
        const idleMinutes = (Date.now() - this.actionTime) / 1000 / 60;
        const maxIdleMinutes = AppSettingsModel.instance.get('idleMinutes');
        if (maxIdleMinutes && idleMinutes > maxIdleMinutes) {
            Backbone.trigger('user-idle');
        }
    },
    regUserAction() {
        this.actionTime = Date.now();
    }
};

Backbone.on('power-monitor-resume', IdleTracker.checkIdle, IdleTracker);

export { IdleTracker };
