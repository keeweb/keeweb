'use strict';

var Backbone = require('backbone'),
    RuntimeInfo = require('../../comp/runtime-info'),
    Links = require('../../const/links');

var SettingsHelpView = Backbone.View.extend({
    template: require('templates/settings/settings-help.hbs'),

    render: function() {
        var appInfo = 'KeeWeb v' + RuntimeInfo.version + ' (' + RuntimeInfo.commit + ', ' + RuntimeInfo.buildDate + ')\n' +
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
