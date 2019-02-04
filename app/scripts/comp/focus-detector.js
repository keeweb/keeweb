const Backbone = require('backbone');
const FeatureDetector = require('../util/feature-detector');
const Launcher = require('../comp/launcher');

const FocusDetector = {
    init() {
        this.isFocused = true;
        this.detectsFocusWithEvents = !FeatureDetector.isDesktop && !FeatureDetector.isMobile;
        window.onfocus = () => {
            this.isFocused = true;
            Backbone.trigger('focus');
        };
        window.onblur = () => {
            this.isFocused = false;
            Backbone.trigger('blur');
        };
    },

    hasFocus() {
        if (this.detectsFocusWithEvents) {
            return this.isFocused;
        } else if (Launcher) {
            return Launcher.isAppFocused();
        } else {
            return true;
        }
    }
};

module.exports = FocusDetector;
