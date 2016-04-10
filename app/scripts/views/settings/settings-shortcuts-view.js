'use strict';

var Backbone = require('backbone'),
    Launcher = require('../../comp/launcher'),
    FeatureDetector = require('../../util/feature-detector');

var SettingsShortcutsView = Backbone.View.extend({
    template: require('templates/settings/settings-shortcuts.hbs'),

    render: function() {
        this.renderTemplate({
            cmd: FeatureDetector.actionShortcutSymbol(true),
            alt: FeatureDetector.altShortcutSymbol(true),
            global: FeatureDetector.globalShortcutSymbol(true),
            globalIsLarge: FeatureDetector.globalShortcutIsLarge(),
            globalShortcutsSupported: !!Launcher,
            autoTypeSupported: !!Launcher
        });
    }
});

module.exports = SettingsShortcutsView;
