const FeatureDetector = require('./feature-detector');
const Launcher = require('../comp/launcher');

const FocusDetector = function () {
    this.isFocused = false;
    if (FeatureDetector.isBrowser) {
        window.onblur = () => { this.isFocused = false; };
        window.onfocus = () => { this.isFocused = true; };
    }
};

FocusDetector.prototype.hasFocus = function () {
    if (FeatureDetector.isBrowser) {
        return this.isFocused;
    } else {
        return Launcher.isAppFocused();
    }
};

module.exports = FocusDetector;
