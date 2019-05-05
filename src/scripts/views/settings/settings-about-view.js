import Backbone from 'backbone';
import RuntimeInfo from '../../comp/runtime-info';
import Links from '../../const/links';

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

export default SettingsAboutView;
