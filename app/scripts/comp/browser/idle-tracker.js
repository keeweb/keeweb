import { Events } from 'framework/events';
import { AppSettingsModel } from 'models/app-settings-model';

const IdleTracker = {
    actionTime: Date.now(),
    init() {
        setInterval(this.checkIdle.bind(this), 1000 * 60);
    },
    checkIdle() {
        const idleMinutes = (Date.now() - this.actionTime) / 1000 / 60;
        const maxIdleMinutes = AppSettingsModel.idleMinutes;
        if (maxIdleMinutes && idleMinutes > maxIdleMinutes) {
            Events.emit('before-user-idle');
            Events.emit('user-idle');
        }
    },
    regUserAction() {
        this.actionTime = Date.now();
    }
};

Events.on('power-monitor-resume', () => IdleTracker.checkIdle);

export { IdleTracker };
