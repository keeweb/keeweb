import { View } from 'framework/views/view';
import { StringFormat } from 'util/formatting/string-format';
import { Logger } from 'util/logger';
import template from 'templates/settings/settings-logs-view.hbs';

class SettingsLogsView extends View {
    parent = '.settings__general-advanced';
    template = template;
    levelToColor = { debug: 'muted', warn: 'yellow', error: 'red' };

    render() {
        const logs = Logger.getLast().map((item) => ({
            level: item.level,
            color: this.levelToColor[item.level],
            msg:
                '[' +
                StringFormat.padStr(item.level.toUpperCase(), 5) +
                '] ' +
                item.args.map((arg) => this.mapArg(arg)).join(' ')
        }));
        super.render({ logs });
    }

    mapArg(arg) {
        if (arg === null) {
            return 'null';
        }
        if (arg === undefined) {
            return 'undefined';
        }
        if (arg === '') {
            return '""';
        }
        if (!arg || !arg.toString() || typeof arg !== 'object') {
            return arg ? arg.toString() : arg;
        }
        if (arg instanceof Array) {
            return '[' + arg.map((item) => this.mapArg(item)).join(', ') + ']';
        }
        let str = arg.toString();
        if (str === '[object Object]') {
            const cache = [];
            str = JSON.stringify(arg, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (cache.indexOf(value) !== -1) {
                        return;
                    }
                    cache.push(value);
                }
                return value;
            });
        }
        return str;
    }
}

export { SettingsLogsView };
