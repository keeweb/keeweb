'use strict';

var Backbone = require('backbone'),
    FeatureDetector = require('../../util/feature-detector');

var SettingsShortcutsView = Backbone.View.extend({
    template: require('templates/settings/settings-shortcuts.html'),

    render: function() {
        this.renderTemplate({
            cmd: FeatureDetector.actionShortcutSymbol(true),
            alt: FeatureDetector.altShortcutSymbol(true)
        });
    }
});

module.exports = SettingsShortcutsView;
