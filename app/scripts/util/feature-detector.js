'use strict';

var FeatureDetector = {
    isMac: function() {
        return navigator.platform.indexOf('Mac') >= 0;
    },
    actionShortcutSymbol: function(formatting) {
        return this.isMac() ? '⌘' : formatting ? '<span class="thin">ctrl + </span>' : 'ctrl-';
    },
    altShortcutSymbol: function(formatting) {
        return this.isMac() ? '⌥' : formatting ? '<span class="thin">alt + </span>' : 'alt-';
    }
};

module.exports = FeatureDetector;
