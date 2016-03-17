'use strict';

var Backbone = require('backbone'),
    Storage = require('../../storage');

var SettingsPrvView = Backbone.View.extend({
    template: require('templates/settings/settings-prv.hbs'),

    events: {
        'change .settings__general-prv-field-sel': 'changeField',
        'input .settings__general-prv-field-txt': 'changeField'
    },

    render: function () {
        var storage = Storage[this.model.name];
        if (storage && storage.getSettingsConfig) {
            this.renderTemplate(storage.getSettingsConfig());
        }
        return this;
    },

    changeField: function(e) {
        var id = e.target.dataset.id,
            value = e.target.value;
        if (!e.target.checkValidity()) {
            return;
        }
        var storage = Storage[this.model.name];
        storage.applySetting(id, value);
        if ($(e.target).is('select')) {
            this.render();
        }
    }
});

module.exports = SettingsPrvView;
