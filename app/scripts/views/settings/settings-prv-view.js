const Backbone = require('backbone');
const Storage = require('../../storage');

const SettingsPrvView = Backbone.View.extend({
    template: require('templates/settings/settings-prv.hbs'),

    events: {
        'change .settings__general-prv-field-sel': 'changeField',
        'input .settings__general-prv-field-txt': 'changeField'
    },

    render: function () {
        const storage = Storage[this.model.name];
        if (storage && storage.getSettingsConfig) {
            this.renderTemplate(storage.getSettingsConfig());
        }
        return this;
    },

    changeField: function(e) {
        const id = e.target.dataset.id;
        const value = e.target.value;
        if (!e.target.checkValidity()) {
            return;
        }
        const storage = Storage[this.model.name];
        storage.applySetting(id, value);
        if ($(e.target).is('select')) {
            this.render();
        }
    }
});

module.exports = SettingsPrvView;
