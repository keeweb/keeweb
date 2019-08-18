const Backbone = require('backbone');
const Launcher = require('../../comp/launcher');
const FeatureDetector = require('../../util/feature-detector');

const SettingsShortcutsView = Backbone.View.extend({
    template: require('templates/settings/settings-shortcuts.hbs'),

    render() {
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
