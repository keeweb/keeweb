const Backbone = require('backbone');
const Logger = require('../../util/logger');
const StringFormat = require('../../util/formatting/string-format');

const SettingsLogView = Backbone.View.extend({
    template: require('templates/settings/settings-logs-view.hbs'),

    render() {
        const logs = Logger.getLast().map(item => ({
            level: item.level,
            msg:
                '[' +
                StringFormat.padStr(item.level.toUpperCase(), 5) +
                '] ' +
                item.args.map(arg => this.mapArg(arg)).join(' ')
        }));
        this.renderTemplate({ logs });
        return this;
    },

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
            return '[' + arg.map(item => this.mapArg(item)).join(', ') + ']';
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
});

module.exports = SettingsLogView;
