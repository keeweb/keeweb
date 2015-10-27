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
    },
    shouldMoveHiddenInputToCopySource: function() {
        var ua = navigator.userAgent;
        var iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
        var webkit = !!ua.match(/WebKit/i);
        var iOSSafari = iOS && webkit && !ua.match(/CriOS/i); // shouldn't we do this for mobile chrome as well? check it.
        return !!iOSSafari;
    }
};

module.exports = FeatureDetector;
