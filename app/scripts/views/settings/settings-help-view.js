import { View } from 'framework/views/view';
import { RuntimeInfo } from 'const/runtime-info';
import { Links } from 'const/links';
import { Launcher } from 'comp/launcher';
import template from 'templates/settings/settings-help.hbs';

class SettingsHelpView extends View {
    template = template;

    render() {
        const appInfo =
            'KeeWeb v' +
            RuntimeInfo.version +
            ' (' +
            RuntimeInfo.commit +
            ', ' +
            RuntimeInfo.buildDate +
            ')\n' +
            'Environment: ' +
            (Launcher ? Launcher.name + ' v' + Launcher.version : 'web') +
            '\n' +
            'GUID: ' +
            RuntimeInfo.guid +
            '\n' +
            'UUID: ' +
            RuntimeInfo.uuid +
            '\n' +
            'User-Agent: ' +
            navigator.userAgent;

        super.render({
            issueLink:
                Links.Repo +
                '/issues/new?body=' +
                encodeURIComponent('# please describe your issue here\n\n' + appInfo),
            desktopLink: Links.Desktop,
            webAppLink: Links.WebApp,
            appInfo
        });
    }
}

export { SettingsHelpView };
