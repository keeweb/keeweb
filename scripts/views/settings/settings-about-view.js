import { View } from 'framework/views/view';
import { RuntimeInfo } from 'const/runtime-info';
import { Links } from 'const/links';
import { Features } from 'util/features';
import template from 'templates/settings/settings-about.hbs';

class SettingsAboutView extends View {
    template = template;

    render() {
        super.render({
            version: RuntimeInfo.version,
            licenseLink: Links.License,
            licenseLinkApache: Links.LicenseApache,
            licenseLinkCCBY40: Links.LicenseLinkCCBY40,
            repoLink: Links.Repo,
            donationLink: Links.Donation,
            isDesktop: Features.isDesktop,
            year: new Date().getFullYear()
        });
    }
}

export { SettingsAboutView };
