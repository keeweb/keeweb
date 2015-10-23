'use strict';

var Backbone = require('backbone'),
    RuntimeInfo = require('../../util/runtime-info'),
    Links = require('../../const/links');

var SettingsHelpView = Backbone.View.extend({
    template: require('templates/settings/settings-help.html'),

    render: function() {
        var appInfo = 'KeeWeb v' + RuntimeInfo.version + ' (built at ' + RuntimeInfo.buildDate + ')\n' +
            'Environment: ' + (RuntimeInfo.launcher ? RuntimeInfo.launcher : 'web') + '\n' +
            'User-Agent: ' + RuntimeInfo.userAgent;
        this.renderTemplate({
            issueLink: Links.Repo + '/issues/new?body=' + encodeURIComponent('!please, describe your issue here!\n\n' + appInfo),
            desktopLink: Links.Desktop,
            webAppLink: Links.WebApp,
            appInfo: _.escape(appInfo)
        });
    }
});

module.exports = SettingsHelpView;
