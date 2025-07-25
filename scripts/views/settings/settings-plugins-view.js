import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import { RuntimeInfo } from 'const/runtime-info';
import { Launcher } from 'comp/launcher';
import { SettingsManager } from 'comp/settings/settings-manager';
import { Links } from 'const/links';
import { AppSettingsModel } from 'models/app-settings-model';
import { PluginGallery } from 'plugins/plugin-gallery';
import { PluginManager } from 'plugins/plugin-manager';
import { Comparators } from 'util/data/comparators';
import { SemVer } from 'util/data/semver';
import { Features } from 'util/features';
import { DateFormat } from 'comp/i18n/date-format';
import { Locale } from 'util/locale';
import template from 'templates/settings/settings-plugins.hbs';

class SettingsPluginsView extends View {
    template = template;

    events = {
        'click .settings_plugins-install-btn': 'installClick',
        'click .settings_plugins-uninstall-btn': 'uninstallClick',
        'click .settings_plugins-disable-btn': 'disableClick',
        'click .settings_plugins-enable-btn': 'enableClick',
        'click .settings_plugins-update-btn': 'updateClick',
        'click .settings_plugins-use-locale-btn': 'useLocaleClick',
        'click .settings_plugins-use-theme-btn': 'useThemeClick',
        'click .settings__plugins-gallery-plugin-install-btn': 'galleryInstallClick',
        'input .settings__plugins-gallery-search': 'gallerySearchInput',
        'change select.settings__plugins-plugin-input': 'pluginSettingChange',
        'change input[type=checkbox].settings__plugins-plugin-input': 'pluginSettingChange',
        'input input[type=text].settings__plugins-plugin-input': 'pluginSettingChange',
        'change .settings__plugins-plugin-updates': 'autoUpdateChange',
        'click .settings__plugins-gallery-load-btn': 'loadPluginGalleryClick'
    };

    searchStr = null;
    installFromUrl = null;
    installing = {};
    installErrors = {};

    constructor(model, options) {
        super(model, options);
        this.listenTo(PluginManager, 'change', this.render.bind(this));
        this.listenTo(
            Events,
            'plugin-gallery-load-complete',
            this.pluginGalleryLoadComplete.bind(this)
        );
    }

    render() {
        super.render({
            plugins: PluginManager.plugins
                .map((plugin) => ({
                    id: plugin.id,
                    manifest: plugin.manifest,
                    status: plugin.status,
                    installTime: Math.round(plugin.installTime),
                    updateError: plugin.updateError,
                    updateCheckDate: DateFormat.dtStr(plugin.updateCheckDate),
                    installError: plugin.installError,
                    official: plugin.official,
                    autoUpdate: plugin.autoUpdate,
                    settings: plugin.getSettings()
                }))
                .sort(Comparators.stringComparator('id', true)),
            installingFromUrl: this.installFromUrl && !this.installFromUrl.error,
            installUrl: this.installFromUrl ? this.installFromUrl.url : null,
            installUrlError: this.installFromUrl ? this.installFromUrl.error : null,
            galleryLoading: PluginGallery.loading,
            galleryLoadError: PluginGallery.loadError,
            galleryPlugins: this.getGalleryPlugins(),
            searchStr: this.searchStr,
            hasUnicodeFlags: Features.hasUnicodeFlags,
            pluginDevLink: Links.PluginDevelopStart,
            translateLink: Links.Translation
        });
        if (this.searchStr) {
            this.showFilterResults();
        }
    }

    pluginGalleryLoadComplete() {
        this.render();
        Events.emit('page-geometry', { source: 'view' });
    }

    getGalleryPlugins() {
        if (!PluginGallery.gallery) {
            return null;
        }
        const plugins = PluginManager.plugins;
        return PluginGallery.gallery.plugins
            .map((pl) => ({
                url: pl.url,
                manifest: pl.manifest,
                installing: this.installing[pl.url],
                installError: this.installErrors[pl.url],
                official: pl.official
            }))
            .filter((pl) => !plugins.get(pl.manifest.name) && this.canInstallPlugin(pl))
            .sort((x, y) => x.manifest.name.localeCompare(y.manifest.name));
    }

    canInstallPlugin(plugin) {
        if (plugin.manifest.locale && SettingsManager.allLocales[plugin.manifest.locale.name]) {
            return false;
        }
        if (plugin.manifest.desktop && !Launcher) {
            return false;
        }
        if (
            plugin.manifest.versionMin &&
            SemVer.compareVersions(plugin.manifest.versionMin, RuntimeInfo.version) > 0
        ) {
            return false;
        }
        if (
            plugin.manifest.versionMax &&
            SemVer.compareVersions(plugin.manifest.versionMax, RuntimeInfo.version) > 0
        ) {
            return false;
        }
        return true;
    }

    loadPluginGalleryClick() {
        if (PluginGallery.loading) {
            return;
        }
        PluginGallery.loadPlugins();
        this.render();
    }

    installClick() {
        const installBtn = this.$el.find('.settings_plugins-install-btn');
        const urlTextBox = this.$el.find('#settings__plugins-install-url');
        const errorBox = this.$el.find('.settings__plugins-install-error');
        errorBox.empty();
        const url = urlTextBox.val().trim();
        if (!url) {
            return;
        }
        urlTextBox.prop('disabled', true);
        installBtn.text(Locale.setPlInstallBtnProgress + '...').prop('disabled', true);
        this.installFromUrl = { url };
        PluginManager.install(url, undefined, true)
            .then(() => {
                this.installFinished();
                this.installFromUrl = null;
                this.render();
                this.$el.closest('.scroller').scrollTop(0);
            })
            .catch((e) => {
                this.installFinished();
                this.installFromUrl.error = e;
                this.$el.find('.settings__plugins-install-error').text(e.toString());
                this.$el.closest('.scroller').scrollTop(this.$el.height());
            });
    }

    installFinished() {
        const installBtn = this.$el.find('.settings_plugins-install-btn');
        const urlTextBox = this.$el.find('#settings__plugins-install-url');
        urlTextBox.prop('disabled', false);
        installBtn.text(Locale.setPlInstallBtn).prop('disabled', false);
    }

    uninstallClick(e) {
        const pluginId = $(e.target).data('plugin');
        PluginManager.uninstall(pluginId);
    }

    disableClick(e) {
        const pluginId = $(e.target).data('plugin');
        PluginManager.disable(pluginId);
    }

    enableClick(e) {
        const pluginId = $(e.target).data('plugin');
        PluginManager.activate(pluginId);
    }

    updateClick(e) {
        const pluginId = $(e.target).data('plugin');
        PluginManager.update(pluginId);
    }

    useLocaleClick(e) {
        const locale = $(e.target).data('locale');
        AppSettingsModel.locale = locale;
    }

    useThemeClick(e) {
        const theme = $(e.target).data('theme');
        AppSettingsModel.theme = theme;
    }

    galleryInstallClick(e) {
        const installBtn = $(e.target);
        const pluginId = installBtn.data('plugin');
        const plugin = PluginGallery.gallery.plugins.find((pl) => pl.manifest.name === pluginId);
        installBtn.text(Locale.setPlInstallBtnProgress + '...').prop('disabled', true);
        this.installing[plugin.url] = true;
        delete this.installErrors[plugin.url];
        PluginManager.install(plugin.url, plugin.manifest)
            .catch((e) => {
                this.installErrors[plugin.url] = e;
                delete this.installing[plugin.url];
                this.render();
            })
            .then(() => {
                installBtn.prop('disabled', true);
                delete this.installing[plugin.url];
            });
    }

    gallerySearchInput(e) {
        this.searchStr = e.target.value.toLowerCase();
        this.showFilterResults();
    }

    showFilterResults() {
        const pluginsById = {};
        for (const plugin of PluginGallery.gallery.plugins) {
            pluginsById[plugin.manifest.name] = plugin;
        }
        for (const pluginEl of $('.settings__plugins-gallery-plugin', this.$el)) {
            const pluginId = pluginEl.dataset.plugin;
            const visible = this.pluginMatchesFilter(pluginsById[pluginId]);
            $(pluginEl).toggle(visible);
        }
    }

    pluginMatchesFilter(plugin) {
        const searchStr = this.searchStr;
        const manifest = plugin.manifest;
        return !!(
            !searchStr ||
            manifest.name.toLowerCase().indexOf(searchStr) >= 0 ||
            (manifest.description && manifest.description.toLowerCase().indexOf(searchStr) >= 0) ||
            (manifest.locale &&
                (manifest.locale.name.toLowerCase().indexOf(searchStr) >= 0 ||
                    manifest.locale.title.toLowerCase().indexOf(searchStr) >= 0))
        );
    }

    pluginSettingChange(e) {
        const el = e.target;
        const settingEl = $(el).closest('.settings__plugins-plugin-setting');
        const setting = settingEl.data('setting');
        const pluginId = settingEl.data('plugin');
        const val = el.type === 'checkbox' ? el.checked : el.value;
        const plugin = PluginManager.getPlugin(pluginId);
        plugin.setSettings({ [setting]: val });
    }

    autoUpdateChange(e) {
        const pluginId = $(e.target).data('plugin');
        const enabled = e.target.checked;
        PluginManager.setAutoUpdate(pluginId, enabled);
    }
}

export { SettingsPluginsView };
