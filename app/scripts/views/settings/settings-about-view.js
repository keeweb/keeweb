const Backbone = require('backbone');
const RuntimeInfo = require('../../comp/runtime-info');
const Links = require('../../const/links');

const SettingsAboutView = Backbone.View.extend({
    template: require('templates/settings/settings-about.hbs'),

    render: function() {
        this.renderTemplate({
            version: RuntimeInfo.version,
            licenseLink: Links.License,
            licenseLinkApache: Links.LicenseApache,
            repoLink: Links.Repo,
            donationLink: Links.Donation
        });
    }
});

module.exports = SettingsAboutView;
