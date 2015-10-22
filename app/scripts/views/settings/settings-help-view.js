'use strict';

var Backbone = require('backbone'),
    RuntimeInfo = require('../../util/runtime-info');

var SettingsHelpView = Backbone.View.extend({
    template: require('templates/settings/settings-help.html'),

    render: function() {
        var appInfo = 'KeeWeb v' + RuntimeInfo.version + ' (built at ' + RuntimeInfo.buildDate + ')\n' +
            'Environment: ' + (RuntimeInfo.launcher ? RuntimeInfo.launcher : 'web') + '\n' +
            'User-Agent: ' + RuntimeInfo.userAgent;
        this.renderTemplate({
            issueBody: encodeURIComponent('!please, describe your issue here!\n\n' + appInfo),
            appInfo: _.escape(appInfo)
        });
    }
});

module.exports = SettingsHelpView;
