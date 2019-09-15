import { StringFormat } from 'util/formatting/string-format';
import { Locale } from 'util/locale';

const DateFormat = {
    dtStr(dt) {
        if (typeof dt === 'number') {
            dt = new Date(dt);
        }
        return dt
            ? this.dStr(dt) +
                  ' ' +
                  StringFormat.pad(dt.getHours(), 2) +
                  ':' +
                  StringFormat.pad(dt.getMinutes(), 2) +
                  ':' +
                  StringFormat.pad(dt.getSeconds(), 2)
            : '';
    },

    dStr(dt) {
        if (typeof dt === 'number') {
            dt = new Date(dt);
        }
        return dt
            ? dt.getDate() + ' ' + Locale.monthsShort[dt.getMonth()] + ' ' + dt.getFullYear()
            : '';
    },

    dtStrFs(dt) {
        if (typeof dt === 'number') {
            dt = new Date(dt);
        }
        return dt
            ? dt.getFullYear() +
                  '-' +
                  StringFormat.pad(dt.getMonth() + 1, 2) +
                  '-' +
                  StringFormat.pad(dt.getDate(), 2) +
                  'T' +
                  StringFormat.pad(dt.getHours(), 2) +
                  '-' +
                  StringFormat.pad(dt.getMinutes(), 2) +
                  '-' +
                  StringFormat.pad(dt.getSeconds(), 2)
            : '';
    }
};

export { DateFormat };
