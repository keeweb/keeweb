'use strict';

var Backbone = require('backbone'),
    Logger = require('../../util/logger'),
    Format = require('../../util/format');

var SettingsLogView = Backbone.View.extend({
    template: require('templates/settings/settings-logs-view.hbs'),

    render: function() {
        var logs = Logger.getLast().map(item => ({
            level: item.level,
            msg: '[' + Format.padStr(item.level.toUpperCase(), 5) + '] ' + item.args.join(' ')
        }));
        this.renderTemplate({ logs: logs });
        return this;
    }
});

module.exports = SettingsLogView;
