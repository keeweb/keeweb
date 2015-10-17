'use strict';

var Backbone = require('backbone');

var SettingsAboutView = Backbone.View.extend({
    template: require('templates/settings/settings-about.html'),

    render: function() {
        this.renderTemplate();
    }
});

module.exports = SettingsAboutView;
