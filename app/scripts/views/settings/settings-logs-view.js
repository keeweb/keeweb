'use strict';

const Backbone = require('backbone');
const Logger = require('../../util/logger');
const Format = require('../../util/format');

const SettingsLogView = Backbone.View.extend({
    template: require('templates/settings/settings-logs-view.hbs'),

    render: function() {
        const logs = Logger.getLast().map(item => ({
            level: item.level,
            msg: '[' + Format.padStr(item.level.toUpperCase(), 5) + '] ' + item.args.join(' ')
        }));
        this.renderTemplate({ logs: logs });
        return this;
    }
});

module.exports = SettingsLogView;
