'use strict';

var Backbone = require('backbone');

var SettingsAboutView = Backbone.View.extend({
    template: require('templates/settings/settings-file.html'),

    render: function() {
        this.renderTemplate(this.model);
    }
});

module.exports = SettingsAboutView;
