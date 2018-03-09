const Backbone = require('backbone');
const RuntimeInfo = require('../../comp/runtime-info');
const Links = require('../../const/links');

const SettingsHelpView = Backbone.View.extend({
    template: require('templates/settings/settings-help.hbs'),

    render: function() {
        const appInfo = 'KeeWeb v' + RuntimeInfo.version + ' (' + RuntimeInfo.commit + ', ' + RuntimeInfo.buildDate + ')\n' +
            'Environment: ' + (RuntimeInfo.launcher ? RuntimeInfo.launcher : 'web') + '\n' +
            'User-Agent: ' + RuntimeInfo.userAgent;
        this.renderTemplate({
            issueLink: Links.Repo + '/issues/new?body=' + encodeURIComponent('!please describe your issue here!\n\n' + appInfo),
            desktopLink: Links.Desktop,
            webAppLink: Links.WebApp,
            appInfo: _.escape(appInfo)
        });
    }
});

module.exports = SettingsHelpView;
