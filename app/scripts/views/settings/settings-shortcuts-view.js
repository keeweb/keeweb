'use strict';

var Backbone = require('backbone'),
    FeatureDetector = require('../../util/feature-detector');

var SettingsShortcutsView = Backbone.View.extend({
    template: require('templates/settings/settings-shortcuts.hbs'),

    render: function() {
        this.renderTemplate({
            cmd: FeatureDetector.actionShortcutSymbol(true),
            alt: FeatureDetector.altShortcutSymbol(true)
        });
    }
});

module.exports = SettingsShortcutsView;
