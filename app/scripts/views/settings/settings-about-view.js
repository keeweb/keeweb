'use strict';

var Backbone = require('backbone'),
    RuntimeInfo = require('../../util/runtime-info');

var SettingsAboutView = Backbone.View.extend({
    template: require('templates/settings/settings-about.html'),

    render: function() {
        this.renderTemplate({
            version: RuntimeInfo.version
        });
    }
});

module.exports = SettingsAboutView;
