'use strict';

var Backbone = require('backbone'),
    AppSettingsModel = require('../../models/app-settings-model');

var SettingsGeneralView = Backbone.View.extend({
    template: require('templates/settings/settings-general.html'),

    events: {
        'change .settings__general-theme': 'changeTheme'
    },

    allThemes: {
        d: 'default',
        fb: 'flat blue',
        wh: 'white'
    },

    render: function() {
        var activeTheme = AppSettingsModel.instance.get('theme');
        this.renderTemplate({
            themes: this.allThemes,
            activeTheme: activeTheme
        });
    },

    changeTheme: function(e) {
        var theme = e.target.value;
        AppSettingsModel.instance.set('theme', theme);
        AppSettingsModel.instance.save();
    }
});

module.exports = SettingsGeneralView;
