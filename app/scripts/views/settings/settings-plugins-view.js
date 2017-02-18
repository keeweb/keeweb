'use strict';

const Backbone = require('backbone');
const Locale = require('../../util/locale');
const PluginManager = require('../../plugins/plugin-manager');

const SettingsPluginsView = Backbone.View.extend({
    template: require('templates/settings/settings-plugins.hbs'),

    events: {
        'click .settings_plugins-install-btn': 'installClick'
    },

    render() {
        this.renderTemplate({
            plugins: []
        });
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
    }
});

module.exports = SettingsPluginsView;
