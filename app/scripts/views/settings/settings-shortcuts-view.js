import Backbone from 'backbone';
import Launcher from '../../comp/launcher';
import FeatureDetector from '../../util/feature-detector';

const SettingsShortcutsView = Backbone.View.extend({
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

export default SettingsShortcutsView;
