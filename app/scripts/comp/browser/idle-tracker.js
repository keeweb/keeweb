import { Events } from 'framework/events';
import { AppSettingsModel } from 'models/app-settings-model';
import { Logger } from 'util/logger';

/*
    Idle Tracker
*/

const IdleTracker = {
    actionTime: Date.now(),
    init() {
        setInterval(this.checkIdle.bind(this), 1000 * 60);
        new Logger('idle-tracker').dev('<fnc>:init', '<act>:start');
    },
    checkIdle() {
        const idleMinutes = (Date.now() - this.actionTime) / 1000 / 60;
        const maxIdleMinutes = AppSettingsModel.idleMinutes;

        new Logger('idle-tracker').dev(
            '<fnc>:checkIdle',
            '<msg>:Logout in ' + Math.round(idleMinutes) + '/' + maxIdleMinutes + ' min'
        );

        if (maxIdleMinutes && idleMinutes > maxIdleMinutes) {
            Events.emit('before-user-idle');
            Events.emit('user-idle');
        }

        /*
            clears any text user has entered for their password within 'Open Vault' screen after
            1 minute.

            Important to know that the 1 minute idle time can sometimes be a max of 2 minutes.
            If user refreshes the page, and then decides to enter their password 30 seconds into
            that minute and then suddenly goes idle; their password will be cleared 30 seconds later.

            keep this at 1 minute, because there would be a small chance of lower values wiping out the
            user's password if they're idle for even 1 second before the timer clocks 60.
        */

        if (idleMinutes >= AppSettingsModel.idleWipeCredsMinutes) {
            new Logger('idle-tracker').dev(
                '<fnc>:checkIdle',
                '<evn>:user-idle-login',
                '<msg>:wiping user credentials'
            );

            Events.emit('user-idle-login');
        }
    },
    regUserAction() {
        this.actionTime = Date.now();
    }
};

Events.on('power-monitor-resume', () => IdleTracker.checkIdle);

export { IdleTracker };
