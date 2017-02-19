'use strict';

const Backbone = require('backbone');
const Locale = require('../../util/locale');
const PluginManager = require('../../plugins/plugin-manager');
const AppSettingsModel = require('../../models/app-settings-model');

const SettingsPluginsView = Backbone.View.extend({
    template: require('templates/settings/settings-plugins.hbs'),

    events: {
        'click .settings_plugins-install-btn': 'installClick',
        'click .settings_plugins-uninstall-btn': 'uninstallClick',
        'click .settings_plugins-use-locale-btn': 'useLocaleClick'
    },

    initialize() {
        this.listenTo(PluginManager, 'change:installing change:uninstalling', this.render.bind(this));
    },

    render() {
        const lastInstall = PluginManager.get('lastInstall') || {};
        this.renderTemplate({
            plugins: PluginManager.get('plugins').map(plugin => ({
                id: plugin.id,
                manifest: plugin.get('manifest'),
                status: plugin.get('status')
            })),
            lastInstallUrl: PluginManager.get('installing') || (lastInstall.error ? lastInstall.url : ''),
            lastInstallError: lastInstall.error
        });
        return this;
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

    useLocaleClick(e) {
        const locale = $(e.target).data('locale');
        AppSettingsModel.instance.set('locale', locale);
    }
});

module.exports = SettingsPluginsView;
