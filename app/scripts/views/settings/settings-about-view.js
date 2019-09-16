import { View } from 'view-engine/view';
import { RuntimeInfo } from 'comp/app/runtime-info';
import { Links } from 'const/links';
import template from 'templates/settings/settings-about.hbs';

class SettingsAboutView extends View {
    template = template;

    render() {
        super.render({
            version: RuntimeInfo.version,
            licenseLink: Links.License,
            licenseLinkApache: Links.LicenseApache,
            repoLink: Links.Repo,
            donationLink: Links.Donation
        });
    }
}

export { SettingsAboutView };
