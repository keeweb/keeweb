import { SettingsManager } from 'comp/settings/settings-manager';

const DateFormat = {
    getMonthsForLocale() {
        const format = new Intl.DateTimeFormat(SettingsManager.activeLocale, { month: 'long' });
        const months = [];
        for (let month = 0; month < 12; month++) {
            months.push(format.format(new Date(Date.UTC(2008, month))));
        }
        return months;
    },

    getWeekDaysForLocale() {
        const format = new Intl.DateTimeFormat(SettingsManager.activeLocale, { weekday: 'long' });
        const weekdays = [];
        for (let day = 1; day < 8; day++) {
            weekdays.push(format.format(new Date(Date.UTC(2007, 9, 6 + day))));
        }
        return weekdays;
    },

    getWeekdaysShortForLocale() {
        const format = new Intl.DateTimeFormat(SettingsManager.activeLocale, { weekday: 'short' });
        const weekdays = [];
        for (let day = 1; day < 8; day++) {
            weekdays.push(format.format(new Date(Date.UTC(2007, 9, 6 + day))));
        }
        return weekdays;
    },

    dtStr(dt) {
        if (typeof dt === 'number') {
            dt = new Date(dt);
        }
        return dt
            ? new Intl.DateTimeFormat(SettingsManager.activeLocale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
              }).format(dt)
            : '';
    },

    dStr(dt) {
        if (typeof dt === 'number') {
            dt = new Date(dt);
        }
        return dt
            ? new Intl.DateTimeFormat(SettingsManager.activeLocale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
              }).format(dt)
            : '';
    },

    dtStrFs(dt) {
        if (typeof dt === 'number') {
            dt = new Date(dt);
        }
        return dt ? new Date().toISOString().replaceAll(':', '-').slice(0, 19) : '';
    }
};

export { DateFormat };
