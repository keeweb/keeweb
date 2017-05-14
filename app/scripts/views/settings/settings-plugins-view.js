const Backbone = require('backbone');
const Locale = require('../../util/locale');
const PluginManager = require('../../plugins/plugin-manager');
const PluginGallery = require('../../plugins/plugin-gallery');
const AppSettingsModel = require('../../models/app-settings-model');
const Comparators = require('../../util/comparators');
const Format = require('../../util/format');
const SettingsManager = require('../../comp/settings-manager');
const SignatureVerifier = require('../../util/signature-verifier');
const FeatureDetector = require('../../util/feature-detector');

const SettingsPluginsView = Backbone.View.extend({
    template: require('templates/settings/settings-plugins.hbs'),

    events: {
        'click .settings_plugins-install-btn': 'installClick',
        'click .settings_plugins-uninstall-btn': 'uninstallClick',
        'click .settings_plugins-disable-btn': 'disableClick',
        'click .settings_plugins-enable-btn': 'enableClick',
        'click .settings_plugins-update-btn': 'updateClick',
        'click .settings_plugins-use-locale-btn': 'useLocaleClick',
        'click .settings_plugins-use-theme-btn': 'useThemeClick',
        'click .settings__plugins-gallery-plugin-install-btn': 'galleryInstallClick',
        'input .settings__plugins-gallery-search': 'gallerySearchInput'
    },

    searchStr: null,

    initialize() {
        this.listenTo(PluginManager, 'change', this.render.bind(this));
        this.listenTo(Backbone, 'plugin-gallery-load-complete', this.render.bind(this));
        PluginGallery.loadPlugins();
    },

    render() {
        const lastInstall = PluginManager.get('lastInstall') || {};
        this.renderTemplate({
            plugins: PluginManager.get('plugins').map(plugin => ({
                id: plugin.id,
                manifest: plugin.get('manifest'),
                status: plugin.get('status'),
                installTime: Math.round(plugin.get('installTime')),
                updateError: plugin.get('updateError'),
                updateCheckDate: Format.dtStr(plugin.get('updateCheckDate')),
                installError: plugin.get('installError')
            })).sort(Comparators.stringComparator('id', true)),
            lastInstallUrl: PluginManager.get('installing') || (lastInstall.error ? lastInstall.url : ''),
            lastInstallError: lastInstall.error,
            galleryLoading: PluginGallery.loading,
            galleryLoadError: PluginGallery.loadError,
            galleryPlugins: this.getGalleryPlugins(),
            searchStr: this.searchStr,
            publicKey: SignatureVerifier.getPublicKey(),
            hasUnicodeFlags: FeatureDetector.hasUnicodeFlags()
        });
        if (this.searchStr) {
            this.showFilterResults();
        }
        return this;
    },

    getGalleryPlugins() {
        if (!PluginGallery.gallery) {
            return null;
        }
        const plugins = PluginManager.get('plugins');
        return PluginGallery.gallery.plugins
            .map(pl => pl)
            .filter(pl => !plugins.get(pl.manifest.name) &&
                (!pl.manifest.locale || !SettingsManager.allLocales[pl.manifest.locale.name]))
            .sort((x, y) => x.manifest.name.localeCompare(y.manifest.name));
    },

    installClick() {
        const installBtn = this.$el.find('.settings_plugins-install-btn');
        const urlTextBox = this.$el.find('#settings__plugins-install-url');
        const errorBox = this.$el.find('.settings__plugins-install-error');
        errorBox.html('');
        const url = urlTextBox.val().trim();
        if (!url) {
            return;
        }
        urlTextBox.prop('disabled', true);
        installBtn.text(Locale.setPlInstallBtnProgress + '...').prop('disabled', true);
        PluginManager.install(url)
            .then(() => {
                this.installFinished();
                urlTextBox.val('');
            })
            .catch(e => {
                this.installFinished();
                errorBox.text(e.toString());
            });
    },

    installFinished() {
        const installBtn = this.$el.find('.settings_plugins-install-btn');
        const urlTextBox = this.$el.find('#settings__plugins-install-url');
        urlTextBox.prop('disabled', false);
        installBtn.text(Locale.setPlInstallBtn).prop('disabled', false);
    },

    uninstallClick(e) {
        const pluginId = $(e.target).data('plugin');
        PluginManager.uninstall(pluginId);
    },

    disableClick(e) {
        const pluginId = $(e.target).data('plugin');
        PluginManager.disable(pluginId);
    },

    enableClick(e) {
        const pluginId = $(e.target).data('plugin');
        PluginManager.activate(pluginId);
    },

    updateClick(e) {
        const pluginId = $(e.target).data('plugin');
        PluginManager.update(pluginId);
    },

    useLocaleClick(e) {
        const locale = $(e.target).data('locale');
        AppSettingsModel.instance.set('locale', locale);
    },

    useThemeClick(e) {
        const theme = $(e.target).data('theme');
        AppSettingsModel.instance.set('theme', theme);
    },

    galleryInstallClick(e) {
        const installBtn = $(e.target);
        const pluginId = installBtn.data('plugin');
        const plugin = PluginGallery.gallery.plugins.find(pl => pl.manifest.name === pluginId);
        installBtn.text(Locale.setPlInstallBtnProgress + '...').prop('disabled', true);
        PluginManager.install(plugin.url, plugin.manifest)
            .catch(() => { })
            .then(() => {
                installBtn.prop('disabled', true);
            });
    },

    gallerySearchInput(e) {
        this.searchStr = e.target.value.toLowerCase();
        this.showFilterResults();
    },

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
    },

    pluginMatchesFilter(plugin) {
        const searchStr = this.searchStr;
        const manifest = plugin.manifest;
        return !searchStr ||
            manifest.name.toLowerCase().indexOf(searchStr) >= 0 ||
            manifest.description && manifest.description.toLowerCase().indexOf(searchStr) >= 0 ||
            manifest.locale &&
                (manifest.locale.name.toLowerCase().indexOf(searchStr) >= 0 ||
                manifest.locale.title.toLowerCase().indexOf(searchStr) >= 0);
    }
});

module.exports = SettingsPluginsView;
