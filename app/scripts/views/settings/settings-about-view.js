'use strict';

var Backbone = require('backbone'),
    RuntimeInfo = require('../../comp/runtime-info'),
    Links = require('../../const/links');

var SettingsAboutView = Backbone.View.extend({
    template: require('templates/settings/settings-about.hbs'),

    render: function() {
        this.renderTemplate({
            version: RuntimeInfo.version,
            licenseLink: Links.License,
            repoLink: Links.Repo
        });
    }
});

module.exports = SettingsAboutView;
