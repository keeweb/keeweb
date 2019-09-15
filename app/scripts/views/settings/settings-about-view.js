import Backbone from 'backbone';
import { RuntimeInfo } from 'comp/app/runtime-info';
import { Links } from 'const/links';

const SettingsAboutView = Backbone.View.extend({
    template: require('templates/settings/settings-about.hbs'),

    render() {
        this.renderTemplate({
            version: RuntimeInfo.version,
            licenseLink: Links.License,
            licenseLinkApache: Links.LicenseApache,
            repoLink: Links.Repo,
            donationLink: Links.Donation
        });
    }
});

export { SettingsAboutView };
