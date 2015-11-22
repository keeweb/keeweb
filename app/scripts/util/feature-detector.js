'use strict';

var FeatureDetector = {
    isMac: function() {
        return navigator.platform.indexOf('Mac') >= 0;
    },
    isMobile: function() {
        return typeof window.orientation !== 'undefined';
    },
    isDesktop: function() {
        return !this.isMobile();
    },
    actionShortcutSymbol: function(formatting) {
        return this.isMac() ? '⌘' : formatting ? '<span class="thin">ctrl + </span>' : 'ctrl-';
    },
    altShortcutSymbol: function(formatting) {
        return this.isMac() ? '⌥' : formatting ? '<span class="thin">alt + </span>' : 'alt-';
    },
    shouldMoveHiddenInputToCopySource: function() {
        return /(iPad|iPhone)/i.test(navigator.userAgent);
    },
    canCopyReadonlyInput: function() {
        return !(/CriOS/i.test(navigator.userAgent));
    }
};

module.exports = FeatureDetector;
